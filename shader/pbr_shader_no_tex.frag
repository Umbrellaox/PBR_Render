    #version 330 core
out vec4 FragColor;

in vec2 TexCoords;
in vec3 WorldPos;
in vec3 Normal;


    
//pbr
uniform vec3 albedo;
uniform float metallic;
uniform float roughness;
uniform float ao;


//IBL
uniform samplerCube irradianceMap;
uniform samplerCube prefilterMap;
uniform sampler2D brdfLUT;

//lights
//�ܹ��ĸ����Դ
uniform vec3 lightPositions[4];
uniform vec3 lightColors[4];

uniform vec3 camPos;

const float PI = 3.14159265359;

vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness);
vec3 fresnelSchlick(float cosTheta, vec3 F0);
float DistributionGGX(vec3 N, vec3 H, float roughness);
float GeometrySchlickGGX(float NdotV, float roughness);
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness);





void main()
{
    //N ����
    vec3 N = normalize(Normal);
    //V ViewDir
    vec3 V = normalize(camPos - WorldPos);
    //R ���ߵķ����
    vec3 R = reflect(-V, N); 
    //F0Ϊ���������ֵ, ����0��ʱ, ���ڴ�ֱ�۲����ʱ�ж��ٹ��߱�����, �˴�Ϊ4%
    vec3 F0 = vec3(0.04); 
    //���ݽ�����, ��F0��albedo���в�ֵ
    //�� F0 = F0 * (1 - metallic) + albedo * metallic
    F0 = mix(F0, albedo, metallic);
    vec3 Lo = vec3(0.0);
    //�����ǵ��Դ, ���Դ�ѭ���ɵ�Ч�� ����İ������������ֱ�ӹ�Դ�����.
    for(int i = 0; i < 4; ++i)
    {
        //calculate per-light radiance
        // L LightDir
        vec3 L = normalize(lightPositions[i] - WorldPos);
        // H Half Vector
        vec3 H = normalize(V + L);

        //��Դ�����ص�ľ���
        float distance = length(lightPositions[i] - WorldPos);
        //˥��
        float attenuation = 1.0 / (distance * distance);
        vec3 radiance = lightColors[i] * attenuation;

        //cook - torrance brdf
        float NDF = DistributionGGX(N, H, roughness);
        float G = GeometrySmith(N, V, L, roughness);
        vec3 F = fresnelSchlickRoughness(max(dot(H, V), 0.0), F0, roughness);

        //����
        vec3 nominator = NDF * G * F;
        //��ĸ
        float denominator = 4.0  * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.001;
        vec3 specular = nominator / denominator;

        //F Ϊ��������ص���, �������Ǳ�����Ĺ�����ռ�ı��� Specular
        vec3 kS = F;
        //(1 - F) ��������Ĺ�����ռ�ı���
        vec3 kD = vec3(1.0) - kS;
        //���������������, ��˲�����������
        //ֻ��Ҫ���Էǽ����Ĳ��ּ���.
        kD *= 1.0 - metallic;

        //add to outgoing radiance Lo
        float NdotL = max(dot(N, L), 0.0);  
        //����û�а�kS�˽������ʷ�����,������Ϊ������BRDF�г��˷�����ϵ��F, kS = F, ������ǲ���Ҫ�ٳ�һ��.
        //���յĽ��L0, ��������ߵ�radiance
        Lo += (kD * albedo / PI + specular) * radiance * NdotL;
    }

    // ambient lighting (we now use IBL as the ambient term)
    vec3 F = fresnelSchlickRoughness(max(dot(N, V), 0.0), F0, roughness);
    vec3 kS = F;
    vec3 kD = 1.0 - kS;
    kD *= 1.0 - metallic;

    vec3 irradiance = texture(irradianceMap, N).rgb;
    vec3 diffuse = irradiance * albedo;

    const float MAX_REFLECTION_LOD = 4.0;
    vec3 prefilteredColor = textureLod(prefilterMap, R, roughness * MAX_REFLECTION_LOD).rgb;
    vec2 brdf = texture(brdfLUT, vec2(max(dot(N, V), 0.0), roughness)).rg;
    vec3 specular = prefilteredColor * (F * brdf.x + brdf.y);


    vec3 ambient = (kD * diffuse + specular) * ao;
    //vec3 ambient = vec3(0.03) * albedo * ao;
    vec3 color = ambient + Lo;

    //HDRɫ��ӳ��, Reinhardӳ��
    color = color / (color + vec3(1.0));
    //gamma����, �˶Թ��յ����жȲ������Ե�, ������Ҫ��gamma���������մ����Կռ�������Ȼ�ġ��������۵ķ����Կռ�.
    color = pow(color, vec3(1.0/2.2)); 

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
    float a2 = a * a;   //�Ĵη�?
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
//Ϊ����Ч�Ĺ��㼸�β��֣���Ҫ���۲췽�򣨼����ڱ�(Geometry Obstruction)���͹��߷���������������Ӱ(Geometry Shadowing)�������ǽ�ȥ

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness)
{
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2;
}

vec3 fresnelSchlick(float cosTheta, vec3 F0)
{
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
} 

