import { useEffect, useState } from 'react';

let pushFn: ((msg: string) => void) | null = null;

/** הצגת הודעת toast מכל מקום בקוד. */
export function toast(message: string): void {
  pushFn?.(message);
}

export function ToastHost() {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    pushFn = (m: string) => {
      setMsg(m);
      setShow(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShow(false), 2600);
    };
    return () => {
      pushFn = null;
      clearTimeout(timer);
    };
  }, []);

  return <div className={`toast${show ? ' show' : ''}`} role="status">{msg}</div>;
}
