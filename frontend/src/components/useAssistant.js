import { useContext } from "react";
import AssistantContext from "./AssistantContext";

export default function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) throw new Error("useAssistant must be used within AssistantProvider");
  return context;
}
