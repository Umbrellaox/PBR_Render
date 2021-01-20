#pragma once

#ifndef MY_IMGUI_H
#define MY_IMGUI_H




#include "glHeader.h"
#include "imgui/imgui.h"
#include "imgui/imgui_impl_glfw.h"
#include "imgui/imgui_impl_opengl3.h"
#include <iostream>

class MyImgui
{
public:
    MyImgui(GLFWwindow* window, const char* version = "#version 330")
        : window_(window),
        glsl_version_(version)
    {
        IMGUI_CHECKVERSION();
        ImGui::CreateContext();
        ImGuiIO& io = ImGui::GetIO(); (void)io;
        ImGui_ImplGlfw_InitForOpenGL(window, true);
        ImGui_ImplOpenGL3_Init(glsl_version_);
        ImGui::StyleColorsDark();
    }

    void render()
    {
        //Rendering
        ImGui::Render();
        ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());
    }

    void newFrame()
    {
        ImGui_ImplOpenGL3_NewFrame();
        ImGui_ImplGlfw_NewFrame();
        ImGui::NewFrame();
    }


    ~MyImgui()
    {
        ImGui_ImplOpenGL3_Shutdown();
        ImGui_ImplGlfw_Shutdown();
        ImGui::DestroyContext();

        std::cout << "Destructor of MyImgui have been called" << std::endl;
    }


protected:
    GLFWwindow* window_;
    const char* glsl_version_;
};


#endif // !MY_IMGUI_H