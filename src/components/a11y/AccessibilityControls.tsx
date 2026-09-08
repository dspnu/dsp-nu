import { Type, Contrast, PersonStanding, Underline } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAccessibilityPrefs } from '@/components/a11y/AccessibilityProvider';
import type { ContrastPref, MotionPref, TextScale } from '@/lib/a11yPreferences';

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-2" role="radiogroup" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg border-2 px-2 py-2.5 text-center text-xs font-medium transition-all hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              selected
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-transparent bg-muted/50 text-muted-foreground'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function AccessibilityControls() {
  const { prefs, setPrefs } = useAccessibilityPrefs();

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">Text size</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Enlarge type across the app. You can also pinch-zoom in the browser.
        </p>
        <ChoiceGroup<TextScale>
          label="Text size"
          value={prefs.textScale}
          onChange={(textScale) => setPrefs({ textScale })}
          options={[
            { value: 'default', label: 'Default' },
            { value: 'large', label: 'Large' },
            { value: 'xlarge', label: 'Extra large' },
          ]}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <PersonStanding className="h-4 w-4 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">Reduce motion</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Limits animations and movement. “Device” follows your phone or computer setting.
        </p>
        <ChoiceGroup<MotionPref>
          label="Reduce motion"
          value={prefs.motion}
          onChange={(motion) => setPrefs({ motion })}
          options={[
            { value: 'system', label: 'Device' },
            { value: 'reduce', label: 'On' },
            { value: 'full', label: 'Off' },
          ]}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Contrast className="h-4 w-4 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">Contrast</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Stronger borders and text. “Device” follows a high-contrast system setting when one is available.
        </p>
        <ChoiceGroup<ContrastPref>
          label="Contrast"
          value={prefs.contrast}
          onChange={(contrast) => setPrefs({ contrast })}
          options={[
            { value: 'system', label: 'Device' },
            { value: 'more', label: 'High' },
            { value: 'standard', label: 'Standard' },
          ]}
        />
      </div>

      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="min-w-0 pr-4 flex-1">
          <Label htmlFor="underline-links" className="text-sm font-medium cursor-pointer inline-flex items-center gap-2">
            <Underline className="h-4 w-4 text-muted-foreground" aria-hidden />
            Underline links
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Show underlines so links are not identified by color alone.
          </p>
        </div>
        <Switch
          id="underline-links"
          checked={prefs.underlineLinks}
          onCheckedChange={(underlineLinks) => setPrefs({ underlineLinks })}
          className="shrink-0"
        />
      </div>
    </div>
  );
}
