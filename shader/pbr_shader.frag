#version 330 core
out vec4 FragColor;

in vec2 TexCoords;
in vec3 WorldPos;
in vec3 Normal;



//material
uniform sampler2D albedoMap;
uniform sampler2D normalMap;
uniform sampler2D metallicMap;
uniform sampler2D roughnessMap;
uniform sampler2D aoMap;

//IBL
uniform samplerCube irradianceMap;
uniform samplerCube prefilterMap;
uniform sampler2D brdfLUT;

//lights
//总共四个点光源
uniform vec3 lightPositions[4];
uniform vec3 lightColors[4];

uniform vec3 camPos;
uniform bool HDR;
uniform bool Gamma;


const float PI = 3.14159265359;

vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness);
vec3 fresnelSchlick(float cosTheta, vec3 F0);
float DistributionGGX(vec3 N, vec3 H, float roughness);
float GeometrySchlickGGX(float NdotV, float roughness);
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness);
vec3 getNormalFromMap();


vec3 getNormalFromMap()
{
    //切线空间 => 世界空间
    // 从法线贴图范围[0,1]获取法线 // 将法线向量转换为范围[-1,1]
    vec3 tangentNormal = texture(normalMap, TexCoords).xyz * 2.0 - 1.0;

    vec3 Q1  = dFdx(WorldPos);
    vec3 Q2  = dFdy(WorldPos);
    vec2 st1 = dFdx(TexCoords);
    vec2 st2 = dFdy(TexCoords);

    vec3 N   = normalize(Normal);
    vec3 T  = normalize(Q1*st2.t - Q2*st1.t);
    vec3 B  = -normalize(cross(N, T));
    mat3 TBN = mat3(T, B, N);

    return normalize(TBN * tangentNormal);
}

void main()
{


    vec3 albedo     = pow(texture(albedoMap, TexCoords).rgb, vec3(2.2));
    float metallic  = texture(metallicMap, TexCoords).r;
    float roughness = texture(roughnessMap, TexCoords).r;
    float ao        = texture(aoMap, TexCoords).r;
    

    //vec3 N = normalize(Normal);
    //法线
    vec3 N = getNormalFromMap();
    //V viewDir
    vec3 V = normalize(camPos - WorldPos);
    //R 视线的反射角
    vec3 R = reflect(-V, N); 
    //F0为菲涅尔项初值, 即在0°时, 即在垂直观察表面时有多少光线被反射, 此处为4%
    vec3 F0 = vec3(0.04); 

    //根据金属度, 对F0和albedo进行插值
    //即 F0 = F0 * (1 - metallic) + albedo * metallic
    F0 = mix(F0, albedo, metallic);
    vec3 Lo = vec3(0.0);
    //由于是点光源, 所以此循环可等效于 物体的半球领域对所有直接光源求积分.
    for(int i = 0; i < 4; ++i)
    {
        //calculate per-light radiance
        // L LightDir
        vec3 L = normalize(lightPositions[i] - WorldPos);
        // H Half Vector
        vec3 H = normalize(V + L);

        //光源与像素点的距离
        float distance = length(lightPositions[i] - WorldPos);
        //衰减
        float attenuation = 1.0 / (distance * distance);
        vec3 lightRadiance = lightColors[i] * attenuation;

        //cook - torrance brdf
        float NDF = DistributionGGX(N, H, roughness);
        float G = GeometrySmith(N, V, L, roughness);
        vec3 F = fresnelSchlickRoughness(max(dot(H, V), 0.0), F0, roughness);

        //分子
        vec3 nominator = NDF * G * F;
        //分母
        float denominator = 4.0  * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.001;
        vec3 specular = nominator / denominator;

        //F 为菲涅尔项返回的量, 描述的是被反射的光线所占的比率 Specular
        vec3 kS = F;
        //(1 - F) 代表被折射的光线所占的比例
        vec3 kD = vec3(1.0) - kS;
        //金属不会折射光线, 因此不会有漫反射
        //只需要乘以非金属的部分即可.
        kD *= 1.0 - metallic;

        //add to outgoing radiance Lo
        float NdotL = max(dot(N, L), 0.0);    
        //我们没有把kS乘进反射率方程中,这是因为我们在BRDF中成了菲涅尔系数F, kS = F, 因此我们不需要再乘一次.
        //最终的结果L0, 即出射光线的radiance
        Lo += (kD * albedo / PI + specular) * lightRadiance * NdotL;
    }

    //此时Lo仅为对光源的采样积分, 并没有对环境光进行采样.

    // ambient lighting (we now use IBL as the ambient term)
    //用菲涅尔公式计算表面的间接反射率.
    //由于我们无法获得一个明确的Half Vector, 所以我们用N来模拟
    //间接光菲涅尔项
    vec3 F = fresnelSchlickRoughness(max(dot(N, V), 0.0), F0, roughness);
    vec3 kS = F;
    vec3 kD = 1.0 - kS;
    kD *= 1.0 - metallic;

    vec3 irradiance = texture(irradianceMap, N).rgb;
    vec3 diffuse = irradiance * albedo; //将漫反射与物体原来的颜色混合

    //环境贴图卷积最多有5个mip级别 
    const float MAX_REFLECTION_LOD = 4.0;
    vec3 prefilteredColor = textureLod(prefilterMap, R, roughness * MAX_REFLECTION_LOD).rgb;
    //brdf决定dA接收到的光有多少反射到Wo上了
    vec2 brdf = texture(brdfLUT, vec2(max(dot(N, V), 0.0), roughness)).rg;
    vec3 specular = prefilteredColor * (F * brdf.x + brdf.y);


    vec3 ambient = (kD * diffuse + specular) * ao;

    vec3 color = ambient + Lo;
    
    //HDR色调映射
    if(HDR)
    {
        color = color / (color + vec3(1.0));
    }
    //Gamma矫正
    if(Gamma)
    {
        color = pow(color, vec3(1.0/2.2)); 
    }

    FragColor = vec4(color, 1.0);
}

//F
vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness)
{
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
}


//D
float DistributionGGX(vec3 N, vec3 H, float roughness)
{
    float a = roughness * roughness; 
    float a2 = a * a;   //四次方?
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;

    float nom = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    return nom / denom;
}

//G 
float GeometrySchlickGGX(float NdotV, float roughness)
{
    float r = (roughness + 1.0);
    float k_direct = (r * r) / 8.0;

    float nom = NdotV;
    float denom = NdotV * (1.0 - k_direct) + k_direct;

    return nom / denom;
}

//G-Smith
//为了有效的估算几何部分，需要将观察方向（几何遮蔽(Geometry Obstruction)）和光线方向向量（几何阴影(Geometry Shadowing)）都考虑进去

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness)
{
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2;
}

//F
vec3 fresnelSchlick(float cosTheta, vec3 F0)
{
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
} 

