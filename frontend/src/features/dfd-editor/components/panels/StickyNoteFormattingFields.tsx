import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  STICKY_NOTE_COLOR_CONFIG,
  type StickyNoteFontFamily,
  type StickyNoteNodeData,
  type StickyNoteTextAlign,
  type StickyNoteTextSize,
  type StickyNoteVerticalAlign,
} from '../../types'

interface StickyNoteFormattingFieldsProps {
  data: StickyNoteNodeData
  onChange: (updates: Partial<StickyNoteNodeData>) => void
}

export function StickyNoteFormattingFields({ data, onChange }: StickyNoteFormattingFieldsProps) {
  const colors = STICKY_NOTE_COLOR_CONFIG[data.noteColor || 'yellow']

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Background preset</Label>
        <Select
          value={data.noteColor || 'yellow'}
          onValueChange={(value) => onChange({ noteColor: value as StickyNoteNodeData['noteColor'], backgroundColor: undefined })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="yellow">Yellow</SelectItem>
            <SelectItem value="blue">Blue</SelectItem>
            <SelectItem value="green">Green</SelectItem>
            <SelectItem value="pink">Pink</SelectItem>
            <SelectItem value="orange">Orange</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="sticky-background-color">Background color</Label>
          <Input
            id="sticky-background-color"
            type="color"
            value={data.backgroundColor || colors.background}
            onChange={(event) => onChange({ backgroundColor: event.target.value })}
            className="h-9 w-full cursor-pointer p-1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sticky-border-color">Border color</Label>
          <Input
            id="sticky-border-color"
            type="color"
            value={data.borderColor || colors.border}
            onChange={(event) => onChange({ borderColor: event.target.value })}
            className="h-9 w-full cursor-pointer p-1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sticky-text-color">Font color</Label>
        <Input
          id="sticky-text-color"
          type="color"
          value={data.textColor || colors.text}
          onChange={(event) => onChange({ textColor: event.target.value })}
          className="h-9 w-full cursor-pointer p-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Horizontal alignment</Label>
          <Select
            value={data.textAlign || 'left'}
            onValueChange={(value) => onChange({ textAlign: value as StickyNoteTextAlign })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Vertical alignment</Label>
          <Select
            value={data.verticalAlign || 'top'}
            onValueChange={(value) => onChange({ verticalAlign: value as StickyNoteVerticalAlign })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="middle">Middle</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Text size</Label>
          <Select
            value={data.textSize || 'medium'}
            onValueChange={(value) => onChange({ textSize: value as StickyNoteTextSize })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
              <SelectItem value="extraLarge">Extra large</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Font family</Label>
          <Select
            value={data.fontFamily || 'sans'}
            onValueChange={(value) => onChange({ fontFamily: value as StickyNoteFontFamily })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sans">Sans</SelectItem>
              <SelectItem value="serif">Serif</SelectItem>
              <SelectItem value="mono">Monospace</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={!!data.bold} onCheckedChange={(checked) => onChange({ bold: checked === true })} />
          Bold
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={!!data.italic} onCheckedChange={(checked) => onChange({ italic: checked === true })} />
          Italic
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={!!data.underline} onCheckedChange={(checked) => onChange({ underline: checked === true })} />
          Underline
        </label>
      </div>
    </div>
  )
}
