KChat – Real-Time Chat Application with AI Assistant
Overview

KChat is a real-time chat application that allows users to send messages, join conversations, and interact with an AI assistant called KChat Bot. The application supports one-to-one conversations, real-time messaging using Socket.IO, and an AI-powered bot that responds when users mention @kchat. The goal of this project is to demonstrate real-time communication, prompt engineering, and responsible AI integration in a modern web application.

-----------------

Main Features

Real-time messaging using Socket.IO

One-to-one conversations with conversation rooms

Message history stored using backend APIs

AI assistant (KChat Bot) triggered using @kchat

Bot responses powered by OpenAI API

Different prompt styles: instructional, descriptive, and conversational

Read receipts and message status handling

Simple and user-friendly chat interface

-----------------


Technologies Used

Frontend: Next.js (React), TypeScript

Backend: Node.js, Express

Real-time Communication: Socket.IO

AI Integration: OpenAI Chat Completion API

State Management: Custom store (chatStore)

UI Components: Tailwind CSS, Lucide Icons

-----------------

How the AI Bot Works

The AI bot is not always active. It only responds when the user explicitly types @kchat in the message input. When this happens, the message is sent to the backend through Socket.IO. The server detects the @kchat keyword, sends the question to the OpenAI API, saves the response as a message, and then broadcasts it back to the conversation. Bot messages are visually separated in the UI using a special style and icon.

-----------------

Prompt Engineering Strategy

The application uses a base system prompt that defines the AI as “KChat Bot” and instructs it to answer briefly and clearly.
Different prompt types are supported:

Instructional prompts (e.g. listing top-rated movies)

Descriptive prompts (e.g. writing a LinkedIn post)

Conversational prompts (e.g. role-playing as a football manager)

The project mainly uses zero-shot prompting to keep responses fast and simple, which fits the nature of a chat application.

-----------------

Project Purpose

This project was built for academic purposes to demonstrate:

Real-time web communication

Practical prompt engineering

AI integration in chat systems

Ethical and societal considerations of AI usage
