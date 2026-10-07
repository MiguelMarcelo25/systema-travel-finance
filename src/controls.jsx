import { Children, lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import * as Select from '@radix-ui/react-select';
import * as Popover from '@radix-ui/react-popover';
import { CalendarDays, Check, ChevronDown, ChevronUp, Eye, EyeOff, Minus, Plus } from 'lucide-react';
const Calendar = lazy(() => import('./Calendar'));

const EMPTY = '__systema_empty_option__';
const changed = (value, name) => ({ target: { value, name }, currentTarget: { value, name } });

export function SelectControl({ children, value, defaultValue, onChange, name, required, disabled, id, className = '', ...props }) {
  const options = Children.toArray(children).map(option => ({ value: String(option.props.value ?? option.props.children), label: option.props.children, disabled: option.props.disabled }));
  const [local, setLocal] = useState(defaultValue ?? options[0]?.value ?? ''), [container, setContainer] = useState(), [invalid, setInvalid] = useState(false);
  const trigger = useRef(null), current = value === undefined ? local : String(value);
  function select(next) { const selected = next === EMPTY ? '' : next; setLocal(selected); setInvalid(false); onChange?.(changed(selected, name)); }
  return <div className="min-w-0" onInvalid={event => { event.preventDefault(); setInvalid(true); trigger.current?.focus(); }}>
    <Select.Root value={current} onValueChange={select} name={name} required={required} disabled={disabled} onOpenChange={open => { if (open) setContainer(trigger.current?.closest('dialog') || undefined); }}>
      <Select.Trigger {...props} id={id} ref={trigger} aria-invalid={invalid || undefined} className={`custom-select ${className}`}>
        <Select.Value placeholder={options.find(option => !option.value)?.label || 'Choose an option'}/><Select.Icon><ChevronDown size={17}/></Select.Icon>
      </Select.Trigger>
      <Select.Portal container={container}><Select.Content position="popper" sideOffset={7} collisionPadding={12} className="select-menu">
        <Select.ScrollUpButton className="select-scroll"><ChevronUp size={16}/></Select.ScrollUpButton>
        <Select.Viewport className="select-options">{options.map(option => <Select.Item key={option.value} value={option.value || EMPTY} disabled={option.disabled} className="select-option"><Select.ItemText>{option.label}</Select.ItemText><Select.ItemIndicator><Check size={16}/></Select.ItemIndicator></Select.Item>)}</Select.Viewport>
        <Select.ScrollDownButton className="select-scroll"><ChevronDown size={16}/></Select.ScrollDownButton>
      </Select.Content></Select.Portal>
    </Select.Root>
    {invalid && <p role="alert" className="mt-1.5 text-xs text-rose-800">Please choose an option.</p>}
  </div>;
}

export function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return undefined;
  const [year, month, day] = value.split('-').map(Number), date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}
const dateValue = date => `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function DateControl({ value, defaultValue = '', onChange, min, max, name, id, disabled, required, ...props }) {
  const [local, setLocal] = useState(defaultValue), [open, setOpen] = useState(false), [container, setContainer] = useState(), [month, setMonth] = useState(() => parseDate(value || defaultValue) || parseDate(min) || new Date());
  const input = useRef(null), current = value === undefined ? local : value, selected = parseDate(current), earliest = parseDate(min), latest = parseDate(max);
  function validate(text) { return text && !parseDate(text) ? 'Enter a valid date as YYYY-MM-DD.' : text && min && text < min ? `Choose a date on or after ${min}.` : text && max && text > max ? `Choose a date on or before ${max}.` : ''; }
  useEffect(() => { input.current?.setCustomValidity(validate(current)); }, [current, min, max]);
  function update(text) { setLocal(text); input.current?.setCustomValidity(validate(text)); onChange?.(changed(text, name)); }
  function toggle(next) { if (next) { setContainer(input.current?.closest('dialog') || undefined); setMonth(selected || earliest || new Date()); } setOpen(next); }
  return <Popover.Root open={open} onOpenChange={toggle}><Popover.Anchor className="control-shell">
    <input {...props} ref={input} id={id} name={name} type="text" inputMode="numeric" placeholder="YYYY-MM-DD" value={current} disabled={disabled} required={required} maxLength={10} onChange={event => update(event.target.value)} className="!pr-12 tabular-nums"/>
    <Popover.Trigger asChild><button type="button" disabled={disabled} aria-label={`Open ${props['aria-label'] || 'date'} calendar`} className="control-action"><CalendarDays size={19}/></button></Popover.Trigger>
  </Popover.Anchor><Popover.Portal container={container}><Popover.Content side="left" align="start" sideOffset={8} collisionBoundary={container} collisionPadding={12} className="calendar-menu" aria-label="Choose a date" onOpenAutoFocus={event => { event.preventDefault(); }}>
    <Suspense fallback={<p role="status" className="p-6 text-sm text-slate-600">Loading calendar…</p>}><Calendar mode="single" required selected={selected} month={month} onMonthChange={setMonth} onSelect={date => { if (date) { update(dateValue(date)); setOpen(false); } }} captionLayout="dropdown" startMonth={earliest || new Date(1900, 0)} endMonth={latest || new Date(2100, 11)} disabled={[...(earliest ? [{ before: earliest }] : []), ...(latest ? [{ after: latest }] : [])]}/></Suspense>
    <div className="calendar-footer"><button type="button" disabled={!!validate(dateValue(new Date()))} onClick={() => { update(dateValue(new Date())); setOpen(false); }}>Today</button>{!required && <button type="button" onClick={() => { update(''); setOpen(false); }}>Clear date</button>}</div>
  </Popover.Content></Popover.Portal></Popover.Root>;
}

export function InputControl({ type = 'text', ...props }) {
  const [revealed, setRevealed] = useState(false), input = useRef(null);
  if (type === 'date') return <DateControl {...props}/>;
  if (type !== 'password' && type !== 'number') return <input type={type} {...props}/>;
  function step(direction) { if (direction > 0) input.current.stepUp(); else input.current.stepDown(); props.onChange?.({ target: input.current, currentTarget: input.current }); }
  return <div className="control-shell"><input {...props} ref={input} type={type === 'password' && revealed ? 'text' : type} className={`${props.className || ''} ${type === 'number' ? '!pr-24' : '!pr-12'}`}/>
    {type === 'password' ? <button type="button" disabled={props.disabled} aria-label={`${revealed ? 'Hide' : 'Show'} password`} aria-pressed={revealed} className="control-action" onClick={() => setRevealed(previous => !previous)}>{revealed ? <EyeOff size={18}/> : <Eye size={18}/>}</button> : <div className="number-actions"><button type="button" disabled={props.disabled || (props.min !== undefined && props.value !== '' && Number(props.value) <= Number(props.min))} aria-label={`Decrease ${props['aria-label'] || 'value'}`} onClick={() => step(-1)}><Minus size={15}/></button><button type="button" disabled={props.disabled || (props.max !== undefined && Number(props.value) >= Number(props.max))} aria-label={`Increase ${props['aria-label'] || 'value'}`} onClick={() => step(1)}><Plus size={15}/></button></div>}
  </div>;
}

export function CustomField({ label, hint, children, ...props }) {
  const id = useId(), hintId = `${id}-hint`;
  return <div className="min-w-0"><label htmlFor={id} className="mb-2 block text-sm font-medium">{label}{props.required && <span className="ml-1 text-brand" aria-hidden="true">*</span>}</label>{children ? <SelectControl id={id} {...props} aria-describedby={hint ? hintId : undefined}>{children}</SelectControl> : <InputControl id={id} {...props} aria-label={label} aria-describedby={hint ? hintId : undefined}/>} {hint && <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-slate-600">{hint}</p>}</div>;
}
