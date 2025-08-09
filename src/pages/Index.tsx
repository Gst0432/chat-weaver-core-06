import { useState } from "react";
import { ChatLayout } from "@/components/ChatLayout";
import { ModelSelector } from "@/components/ModelSelector";
import { ChatArea } from "@/components/ChatArea";

const Index = () => {
  const [selectedModel, setSelectedModel] = useState("gpt-4-turbo");

  return (
    <ChatLayout>
      <ModelSelector 
        selectedModel={selectedModel} 
        onModelChange={setSelectedModel} 
      />
      <ChatArea selectedModel={selectedModel} />
    </ChatLayout>
  );
};

export default Index;