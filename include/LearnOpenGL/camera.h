#pragma once

#ifndef CAMERA_H
#define CAMERA_H

//#include <glad/glad.h>
//#include <glm/glm.hpp>
//#include <glm/gtc/matrix_transform.hpp>

#include <glHeader.h>

enum Camera_Movement
{
    FORWARD,
    BACKWARD,
    LEFT,
    RIGHT,
    RISE,
    FALL
};

//Default camera value
const float YAW = -90.0f;
const float PITCH = 0.0f;
const float SPEED = 2.5f;
const float SENSITIVITY = 0.1f;
const float ZOOM = 45.0f;

class Camera
{
public:


    glm::vec3 position_;
    glm::vec3 front_;
    glm::vec3 up_;
    glm::vec3 right_;
    glm::vec3 worldUp_;

    float yaw_;
    float pitch_;
    float movementSpeed_;
    float mouseSentivity_;
    float zoom_;

    Camera(glm::vec3 position = glm::vec3(0.0f, 0.0f, 0.0f),
        glm::vec3 up = glm::vec3(0.0f, 0.1f, 0.0f),
        float yaw = YAW, float pitch = PITCH)
        : position_(position),
        front_(glm::vec3(0.0f, 0.0f, -1.0f)),
        worldUp_(up),
        yaw_(yaw),
        pitch_(pitch),
        movementSpeed_(SPEED),
        mouseSentivity_(SENSITIVITY),
        zoom_(ZOOM)
    {
        updateCameraVectors();
    }

    Camera(float posX, float posY, float posZ, float upX, float upY, float upZ, float yaw, float pitch)
        :position_(glm::vec3(posX, posY, posZ)),
        front_(glm::vec3(0.0f, 0.0f, -1.0f)),
        worldUp_(glm::vec3(upX, upY, upZ)),
        yaw_(yaw),
        pitch_(pitch),
        movementSpeed_(SPEED),
        mouseSentivity_(SENSITIVITY),
        zoom_(ZOOM)
    {
        updateCameraVectors();
    }

    glm::mat4 GetViewMatrix()
    {
        return glm::lookAt(position_, position_ + front_, up_);
    }

    void ProcessKeyBoard(Camera_Movement direction, float deltaTime)
    {
        float velocity = movementSpeed_ * deltaTime;

        switch (direction)
        {
        case FORWARD:
            position_ += velocity * front_;
            break;
        case BACKWARD:
            position_ -= velocity * front_;
            break;
        case LEFT:
            position_ -= velocity * right_;
            break;
        case RIGHT:
            position_ += velocity * right_;
            break;
        case RISE:
            position_ += velocity * up_;
            break;
        case FALL:
            position_ -= velocity * up_;
            break;
        default:
            break;
        }

        //摄像机的位置改变, 其他属性不变
    }

    void ProcessMouseMovement(float xoffset, float yoffset, GLboolean constrainPitch = true)
    {
        xoffset *= mouseSentivity_;
        yoffset *= mouseSentivity_;

        yaw_ += xoffset;
        pitch_ += yoffset;

        if (constrainPitch)
        {
            if (pitch_ > 89.0f)
            {
                pitch_ = 89.0f;
            }

            if (pitch_ < -89.0f)
            {
                pitch_ = -89.0f;
            }
        }

        updateCameraVectors();
    }

    void ProcessMouseScroll(float yoffset)
    {
        zoom_ -= (float)yoffset;
        if (zoom_ < 1.0f)
        {
            zoom_ = 1.0f;
        }
        if (zoom_ > 45.0f)
        {
            zoom_ = 45.0f;
        }
    }


protected:


    void updateCameraVectors()
    {
        glm::vec3 front;
        front.x = cos(glm::radians(yaw_));
        front.y = sin(glm::radians(pitch_));
        front.z = cos(glm::radians(pitch_)) * sin(glm::radians(yaw_));
        front_ = glm::normalize(front);
        right_ = glm::normalize(glm::cross(front_, worldUp_));
        up_ = glm::normalize(glm::cross(right_, front_));
    }
private:
};


#endif