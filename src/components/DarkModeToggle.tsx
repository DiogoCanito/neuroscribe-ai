import { useEffect, useState, useCallback } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(() => {
    // Initial value from DOM (set during auth load)
    return document.documentElement.classList.contains('dark');
  });

  // Apply class to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    // Smooth transition
    document.documentElement.style.transition = 'background-color 200ms ease, color 200ms ease';
  }, [isDark]);

  const toggle = useCallback(async () => {
    const newValue = !isDark;
    setIsDark(newValue);

    // Persist to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ dark_mode: newValue } as any)
          .eq('user_id', user.id);
      }
    } catch (err) {
      console.warn('Could not save dark mode preference:', err);
    }
  }, [isDark]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">{isDark ? 'Modo Claro' : 'Modo Noturno'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
