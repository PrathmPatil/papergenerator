"use client";

import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Tags } from "lucide-react";
import { LoadingPanel } from "@/components/loading";

interface Topic {
  id: string;
  name: string;
  subjectId: string;
}

interface TopicSelectorProps {
  topics: Topic[];
  selectedTopics: string[];
  onTopicsChange: (topicIds: string[]) => void;
  subjectId?: string;
  disabled?: boolean;
  isLoading?: boolean;
  label?: string;
  multiSelect?: boolean;
  onAddTopic?: (topicName: string) => Promise<void>;
}

export function TopicSelector({
  topics,
  selectedTopics,
  onTopicsChange,
  subjectId,
  disabled = false,
  isLoading = false,
  label = "Topics",
  multiSelect = true,
  onAddTopic,
}: TopicSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [isAddingTopic, setIsAddingTopic] = useState(false);

  const filteredTopics = useMemo(
    () =>
      subjectId
        ? topics.filter((t) => t.subjectId === subjectId)
        : topics,
    [topics, subjectId]
  );

  const selectedTopicsData = useMemo(
    () => topics.filter((t) => selectedTopics.includes(t.id)),
    [topics, selectedTopics]
  );

  const handleToggleTopic = (topicId: string) => {
    if (multiSelect) {
      onTopicsChange(
        selectedTopics.includes(topicId)
          ? selectedTopics.filter((id) => id !== topicId)
          : [...selectedTopics, topicId]
      );
    } else {
      onTopicsChange(
        selectedTopics.includes(topicId) ? [] : [topicId]
      );
    }
  };

  const handleRemoveTopic = (topicId: string) => {
    onTopicsChange(selectedTopics.filter((id) => id !== topicId));
  };

  const handleAddTopic = async () => {
    if (!newTopicName.trim() || !onAddTopic) return;

    setIsAddingTopic(true);
    try {
      await onAddTopic(newTopicName);
      setNewTopicName("");
    } catch (error) {
      console.error("Failed to add topic:", error);
    } finally {
      setIsAddingTopic(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {selectedTopics.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selectedTopics.length} selected
          </Badge>
        )}
      </div>

      {/* Selected Topics Display */}
      {selectedTopicsData.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-md border">
          {selectedTopicsData.map((topic) => (
            <Badge key={topic.id} variant="default" className="flex items-center gap-1">
              {topic.name}
              <button
                onClick={() => handleRemoveTopic(topic.id)}
                className="ml-1 hover:opacity-70 transition-opacity"
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Topic Selection Dropdown */}
      <div className="space-y-2">
        <Select open={isOpen} onOpenChange={setIsOpen}>
          <SelectTrigger
            disabled={disabled || isLoading}
            className="w-full"
          >
            <SelectValue placeholder="Select topics..." />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-64 w-full p-4">
              <div className="space-y-2">
                {isLoading ? (
                  <LoadingPanel
                    label="Loading topics..."
                    icon={Tags}
                    size="md"
                    className="min-h-[100px] py-4"
                  />
                ) : filteredTopics.length > 0 ? (
                  <div className="space-y-2">
                    {filteredTopics.map((topic) => (
                      <div
                        key={topic.id}
                        className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded cursor-pointer"
                        onClick={() => handleToggleTopic(topic.id)}
                      >
                        <Checkbox
                          checked={selectedTopics.includes(topic.id)}
                          onCheckedChange={() => handleToggleTopic(topic.id)}
                          disabled={disabled}
                        />
                        <label
                          className="text-sm cursor-pointer flex-1 font-medium"
                        >
                          {topic.name}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    No topics available
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Add New Topic */}
            {onAddTopic && (
              <div className="border-t p-2 space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Add New Topic
                </div>
                <div className="flex gap-1">
                  <Input
                    placeholder="Topic name..."
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleAddTopic();
                      }
                    }}
                    className="h-8 text-xs"
                    disabled={isAddingTopic}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddTopic}
                    disabled={!newTopicName.trim() || isAddingTopic}
                    className="h-8 text-xs"
                  >
                    {isAddingTopic ? "..." : "Add"}
                  </Button>
                </div>
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Info Text */}
      <p className="text-xs text-muted-foreground">
        {multiSelect
          ? "Select one or more topics for your paper"
          : "Select a topic for this section"}
      </p>
    </div>
  );
}
