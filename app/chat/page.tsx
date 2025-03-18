"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useChatStore from "@/store/chatStore";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import CreateConversationModal from "@/components/chat/CreateConversationModal";
import { Button } from "@/components/button";
import { Toaster } from "react-hot-toast";
import { FiMessageSquare, FiPlus } from "react-icons/fi";
import Pusher from "pusher-js";

export default function ChatPage() {
  const router = useRouter();
  const {
    conversations,
    currentConversation,
    fetchConversations,
    setCurrentConversation,
    addMessageToConversation,
    addConversation,
  } = useChatStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch user ID
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user"); // Change this if your API differs
        const data = await res.json();
        setUserId(data.id);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };

    fetchUser();
    fetchConversations();

    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
      console.error("Pusher env variables are missing.");
      return;
    }

    // Pusher setup
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    let userChannel, chatChannel;

    if (userId) {
      userChannel = pusher.subscribe(`user-${userId}`);
      userChannel.bind("new-conversation", (newConversation) => {
        console.log("New conversation:", newConversation);
        addConversation(newConversation);
      });
    }

    if (currentConversation) {
      chatChannel = pusher.subscribe(`conversation-${currentConversation.id}`);
      chatChannel.bind("new-message", (newMessage) => {
        console.log("New message received:", newMessage);
        addMessageToConversation(newMessage);
      });
    }

    // Cleanup
    return () => {
      if (userChannel) {
        userChannel.unbind_all();
        userChannel.unsubscribe();
      }
      if (chatChannel) {
        chatChannel.unbind_all();
        chatChannel.unsubscribe();
      }
    };
  }, [fetchConversations, setCurrentConversation, currentConversation, userId]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 pt-16">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col">
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center space-x-2">
            <FiMessageSquare className="text-2xl text-yellow-400" />
            <h1 className="text-2xl font-bold">Chat</h1>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            <FiPlus className="mr-2" />
            New Conversation
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Conversation Sidebar */}
          <div className="w-80 border-r border-gray-800 flex-shrink-0 overflow-y-auto">
            <ChatSidebar
              conversations={conversations}
              currentConversationId={currentConversation?.id}
            />
          </div>

          {/* Chat Window or Empty State */}
          <div className="flex-1 overflow-y-auto">
            {currentConversation ? (
              <ChatWindow conversation={currentConversation} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-800 bg-opacity-50">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-2xl font-semibold text-gray-300 mb-2">
                  Select a conversation or start a new one
                </h2>
                <p className="text-gray-400 text-center max-w-md mb-6">
                  Chat with other users or send messages to our support team.
                </p>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black flex items-center"
                >
                  <FiPlus className="mr-2" />
                  Start New Conversation
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Conversation Modal */}
      <CreateConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
