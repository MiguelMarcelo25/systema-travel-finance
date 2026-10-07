import { DayPicker } from 'react-day-picker';
import { useEffect, useRef } from 'react';
import { SelectControl } from './controls';
import 'react-day-picker/style.css';

function CalendarDropdown({ options, ...props }) {
  return <SelectControl {...props} value={String(props.value)} className="calendar-select">{options?.map(option => <option key={option.value} value={String(option.value)} disabled={option.disabled}>{option.label}</option>)}</SelectControl>;
}
const calendarComponents = { Dropdown: CalendarDropdown };

export default function Calendar(props) {
  const root = useRef(null);
  useEffect(() => { (root.current.querySelector('.rdp-selected button') || root.current.querySelector('button:not([disabled])'))?.focus({ preventScroll: true }); }, []);
  return <div ref={root}><DayPicker {...props} components={calendarComponents}/></div>;
}
