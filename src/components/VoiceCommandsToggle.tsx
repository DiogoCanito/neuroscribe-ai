import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { useEditorStore } from '@/stores/editorStore';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Command 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function VoiceCommandsToggle() {
  const { isListening, toggleListening, lastCommand } = useVoiceCommands();
  const { voiceCommandsEnabled, setVoiceCommandsEnabled } = useEditorStore();

  return (
    <div className="flex items-center gap-4">
      {/* Voice Commands Toggle */}
      <div className="flex items-center gap-2">
        <Command className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Comandos</span>
        <Switch
          checked={voiceCommandsEnabled}
          onCheckedChange={setVoiceCommandsEnabled}
        />
      </div>

      {/* Listening Toggle */}
      <Button
        variant={isListening ? "default" : "outline"}
        size="sm"
        onClick={toggleListening}
        disabled={!voiceCommandsEnabled}
        className={cn(
          "gap-2",
          isListening && "bg-primary"
        )}
      >
        {isListening ? (
          <>
            <Volume2 className="w-4 h-4" />
            A ouvir...
          </>
        ) : (
          <>
            <VolumeX className="w-4 h-4" />
            Ouvir
          </>
        )}
      </Button>

      {/* Last Command Display */}
      {lastCommand && voiceCommandsEnabled && (
        <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          Último: "{lastCommand}"
        </div>
      )}
    </div>
  );
}
