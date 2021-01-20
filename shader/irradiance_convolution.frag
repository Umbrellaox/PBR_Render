#version 330 core

out vec4 FragColor;
in vec3 WorldPos;

uniform samplerCube environmentMap;

const float PI = 3.14159265359;

void main()
{	
	//direction equals normal, normal equals hemisphere's orientation
	vec3 N = normalize(WorldPos);
	vec3 irradiance = vec3(0.0);

	vec3 up = vec3(0.0, 1.0, 0.0);
	vec3 right = cross(up, N);
	up = cross(N, right);

	float sampleDelta = 0.025;
	float nrSamples = 0.0;

	//�԰��������ɢ����
	for(float phi = 0.0; phi < 2.0 * PI; phi += sampleDelta)
	{
		for(float theta = 0.0; theta < 0.5 * PI; theta += sampleDelta)
		{	
			//��������ϵ���ѿ�������ϵ
			vec3 tangentSample = vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));

			// tangent space to world sapce
			vec3 sampleVec = tangentSample.x * right + tangentSample.y * up + tangentSample.z * N; 

			//sin(theta) ����������ڿ������� ������ºͿ��������������ǲ�ͬ��.
			irradiance += texture(environmentMap, sampleVec).rgb * cos(theta) * sin(theta);

			nrSamples++;
		}
	}

	irradiance = PI * irradiance * (1.0 / float(nrSamples));

	FragColor = vec4(irradiance * 2, 1.0);
}