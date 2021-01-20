#version 330 core

out vec4 FragColor;

in vec3 localPos;

uniform samplerCube environmentMap;

void main()
{
	vec3 envColor = textureLod(environmentMap, localPos, 1.2).rgb;

	//HDRɫ��ӳ�䵽LDR, Reinhard����
	envColor = envColor / (envColor + vec3(1.0));
	//Gamma����
	envColor = pow(envColor, vec3(1.0 / 2.2));

	FragColor = vec4(envColor, 1.0);
}