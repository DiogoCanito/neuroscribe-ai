import { Button } from '@/components/ui/button';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { useEditorStore } from '@/stores/editorStore';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function VoiceCommandsToggle() {
  const { isListening, toggleListening, lastCommand } = useVoiceCommands();
  const { voiceCommandsEnabled } = useEditorStore();

  return (
    <div className="flex items-center gap-2">
      {/* Single Listen Button */}
      <Button
        variant={isListening ? "default" : "outline"}
        size="sm"
        onClick={toggleListening}
        className={cn(
          "gap-1.5 h-7 text-xs px-2.5",
          isListening && "bg-primary animate-pulse"
        )}
      >
        {isListening ? (
          <>
            <Mic className="w-3.5 h-3.5" />
            A ouvir...
          </>
        ) : (
          <>
            <MicOff className="w-3.5 h-3.5" />
            Ouvir
          </>
        )}
      </Button>

      {/* Last Command Feedback */}
      {lastCommand && isListening && (
        <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded max-w-[200px] truncate">
          ✓ "{lastCommand}"
        </div>
      )}
    </div>
  );
}
