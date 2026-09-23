import {
  useEffect,
  useId,
  useRef,
  Children,
  isValidElement,
  cloneElement,
  type ReactElement,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
} from 'react';
import { X, ChevronRight, CheckCircle2, Inbox } from 'lucide-react';
import s from './UI.module.css';
export function Button({
  primary = false,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      {...props}
      className={`${s.button} ${primary ? s.primary : ''} ${props.className || ''}`}
    >
      {children}
    </button>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  function bind(nodes: ReactNode): ReactNode {
    return Children.map(nodes, (node) => {
      if (!isValidElement(node)) return node;
      const el = node as ReactElement<{
        id?: string;
        children?: ReactNode;
        'aria-describedby'?: string;
      }>;
      if (
        node.type === 'input' ||
        node.type === 'select' ||
        node.type === 'textarea' ||
        node.type === NumberField
      )
        return cloneElement(el, { id, 'aria-describedby': hint ? id + '-hint' : undefined });
      return el.props.children ? cloneElement(el, {}, bind(el.props.children)) : el;
    });
  }
  return (
    <div className={s.field}>
      <label htmlFor={id}>{label}</label>
      {bind(children)}
      {hint && <small id={id + '-hint'}>{hint}</small>}
    </div>
  );
}
export function NumberField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <input
      aria-invalid={
        props.value !== undefined &&
        (props.value === '' || !Number.isFinite(Number(props.value)) || Number(props.value) < 0)
      }
      aria-label={label}
      type="number"
      min="0"
      max="1000000000"
      step="any"
      inputMode="decimal"
      {...props}
    />
  );
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={s.tabs} role="tablist">
      {items.map((x) => (
        <button key={x} role="tab" aria-selected={x === value} onClick={() => onChange(x)}>
          {x}
        </button>
      ))}
    </div>
  );
}
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className={s.pageHeader}>
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}
export function Empty({
  text = '조건에 맞는 자재가 없습니다.',
  children,
}: {
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className={s.empty}>
      <Inbox size={28} />
      <p>{text}</p>
      {children}
    </div>
  );
}
export function ErrorMessage({ text }: { text: string }) {
  return text ? (
    <div className={s.error} role="alert">
      {text}
    </div>
  ) : null;
}
export function Modal({
  title,
  children,
  onClose,
  footer,
  kind = 'normal',
  dirty = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  kind?: 'normal' | 'sheet' | 'full' | 'drawer';
  dirty?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  function close() {
    if (!dirtyRef.current || window.confirm('수정 내용을 버릴까요?')) closeRef.current();
  }
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const el = ref.current!;
    el.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      el.close();
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      className={`${s.modal} ${s[kind]}`}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Tab') {
          const nodes = Array.from(
            ref.current!.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea,a[href]',
            ),
          ).filter((x) => x.getClientRects().length);
          const first = nodes[0],
            last = nodes.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <header>
        <h2 id={id}>{title}</h2>
        <Button aria-label="닫기" title="닫기" onClick={close}>
          <X size={20} />
        </Button>
      </header>
      <div className={s.modalBody}>{children}</div>
      {footer && <footer>{footer}</footer>}
    </dialog>
  );
}
export function Toast({ text }: { text: string }) {
  return text ? (
    <div className={s.toast} role="status">
      <CheckCircle2 size={18} />
      {text}
    </div>
  ) : null;
}
export function MenuRow({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className={s.menuRow} onClick={onClick}>
      {children}
      <ChevronRight size={18} />
    </button>
  );
}
