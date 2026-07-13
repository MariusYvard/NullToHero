---
name: component-patterns
description: "Patterns for composable, accessible component APIs: slots and compound components, controlled vs uncontrolled, and clear prop design."
version: 1.10.0
---

# Component Patterns

*Architecture reference for `/siteasy extract`, `/siteasy build`, and component-heavy design systems. How to design component APIs that are composable, accessible, and don't fight consumers.*

---

## The Core Principle: Components Should Be Stupid About Their Context

A good component doesn't know where it will be used. It exposes a clean API, handles its internal state, and defers everything else to its consumer. This is what makes it reusable.

---

## Compound Components

Group related components that share implicit state. The parent manages state; children access it via context.

```jsx
// Usage — reads like prose, no prop drilling
<Select value={value} onChange={setValue}>
  <Select.Trigger>Choose option</Select.Trigger>
  <Select.Content>
    <Select.Item value="a">Option A</Select.Item>
    <Select.Item value="b">Option B</Select.Item>
  </Select.Content>
</Select>

// Implementation
const SelectContext = createContext(null);

function Select({ value, onChange, children }) {
  const [open, setOpen] = useState(false);
  return (
    <SelectContext.Provider value={{ value, onChange, open, setOpen }}>
      <div role="combobox" aria-expanded={open}>{children}</div>
    </SelectContext.Provider>
  );
}

Select.Trigger = function Trigger({ children }) {
  const { open, setOpen, value } = useContext(SelectContext);
  return (
    <button onClick={() => setOpen(o => !o)} aria-haspopup="listbox">
      {value || children}
    </button>
  );
};

Select.Item = function Item({ value, children }) {
  const ctx = useContext(SelectContext);
  return (
    <div role="option" aria-selected={ctx.value === value}
         onClick={() => { ctx.onChange(value); ctx.setOpen(false); }}>
      {children}
    </div>
  );
};
```

Compound components are the pattern used by Radix UI, React Aria, and Base UI. They give consumers full control over rendering while keeping logic encapsulated.

---

## Polymorphic Components (`as` prop)

Let consumers change the underlying HTML element while keeping component styles and logic:

```tsx
type PolymorphicProps<C extends React.ElementType, Props = {}> = Props &
  Omit<React.ComponentPropsWithRef<C>, keyof Props> & {
    as?: C;
  };

function Text<C extends React.ElementType = 'p'>({
  as,
  children,
  size = 'base',
  weight = 'regular',
  ...rest
}: PolymorphicProps<C, { size?: 'sm' | 'base' | 'lg'; weight?: 'regular' | 'bold' }>) {
  const Component = as ?? 'p';
  return (
    <Component
      data-size={size}
      data-weight={weight}
      {...rest}
    >
      {children}
    </Component>
  );
}

// Usage
<Text>Paragraph</Text>
<Text as="h1" size="lg" weight="bold">Heading</Text>
<Text as="span" size="sm">Inline text</Text>
<Text as={Link} href="/home">Link styled as text</Text>
```

Also useful for buttons that need to render as `<a>` tags:

```tsx
<Button as="a" href="/pricing">View pricing</Button>
```

---

## Controlled vs. Uncontrolled

Always support both. Uncontrolled is easier to use; controlled is necessary for integration.

```tsx
function Toggle({ checked, defaultChecked, onChange }: ToggleProps) {
  // Internal state for uncontrolled mode
  const [internalChecked, setInternalChecked] = useState(defaultChecked ?? false);

  // Controlled: use external value; Uncontrolled: use internal
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internalChecked;

  function handleChange(next: boolean) {
    if (!isControlled) setInternalChecked(next);
    onChange?.(next);
  }

  return (
    <button role="switch" aria-checked={isChecked}
            onClick={() => handleChange(!isChecked)}>
      <span className="thumb" />
    </button>
  );
}

// Uncontrolled — self-managed
<Toggle defaultChecked onChange={val => console.log(val)} />

// Controlled — parent owns state
<Toggle checked={enabled} onChange={setEnabled} />
```

---

## Headless / Renderless Components

Separate logic from presentation. The component provides behaviour; the consumer provides the markup.

```tsx
// Headless accordion — logic only, no styles
function useAccordion(defaultOpenIndex?: number) {
  const [openIndex, setOpenIndex] = useState(defaultOpenIndex ?? null);

  function toggle(index: number) {
    setOpenIndex(prev => prev === index ? null : index);
  }

  function getItemProps(index: number) {
    return {
      isOpen: openIndex === index,
      toggle: () => toggle(index),
      buttonProps: {
        'aria-expanded': openIndex === index,
        onClick: () => toggle(index),
      },
      panelProps: {
        hidden: openIndex !== index,
        'aria-hidden': openIndex !== index,
      },
    };
  }

  return { openIndex, getItemProps };
}

// Consumer renders whatever HTML they want
function FAQ({ items }) {
  const { getItemProps } = useAccordion();
  return (
    <dl>
      {items.map((item, i) => {
        const { buttonProps, panelProps, isOpen } = getItemProps(i);
        return (
          <div key={i} data-open={isOpen}>
            <dt><button {...buttonProps}>{item.question}</button></dt>
            <dd {...panelProps}>{item.answer}</dd>
          </div>
        );
      })}
    </dl>
  );
}
```

This is the model used by Radix Primitives, Downshift, and React Aria. The library owns accessibility and behaviour; you own the DOM and styles.

---

## The Slot Pattern

Allow consumers to replace a specific part of a component with their own element:

```tsx
// Primitive slot utility (or use Radix's Slot)
function Slot({ children, ...props }: { children: React.ReactElement }) {
  return React.cloneElement(children, {
    ...props,
    ...children.props,
    className: [props.className, children.props.className].filter(Boolean).join(' '),
  });
}

function Button({ asChild, children, ...props }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp {...props}>{children}</Comp>;
}

// Usage: renders an <a> with button styles, no wrapping element
<Button asChild>
  <a href="/pricing">View pricing</a>
</Button>
```

`asChild` (Radix's pattern) is cleaner than `as` when you want full control over the child element's props without merging complexity.

---

## Forwarded Refs

Always forward refs on components that wrap native elements:

```tsx
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, ...props }, ref) => {
    const id = useId();
    const errorId = `${id}-error`;
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <input
          ref={ref}
          id={id}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          {...props}
        />
        {error && <p id={errorId} role="alert">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
```

Without `forwardRef`, consumers can't call `.focus()`, `.blur()`, or use the ref for scroll positioning.

---

## Component API Design Principles

**1. Props should be positive, not negative.**
`isLoading` not `isNotLoading`. `isDisabled` not `notClickable`.

**2. Boolean props should be shorthand.**
`<Button disabled>` not `<Button disabled={true}>`.

**3. Variants over boolean prop explosion.**
```tsx
// Bad — combinatorial explosion of booleans
<Button isPrimary isLarge isOutlined />

// Good — single variant prop
<Button variant="primary" size="lg" appearance="outline" />
```

**4. Event handlers follow the `on[Event]` convention.**
`onOpen`, `onChange`, `onClose`. Not `handleOpen`, `whenClosed`, `afterChange`.

**5. Children for content, props for configuration.**
```tsx
// Bad
<Modal title="Confirm" body="Are you sure?" footer={<Button>OK</Button>} />

// Good
<Modal>
  <Modal.Header>Confirm</Modal.Header>
  <Modal.Body>Are you sure?</Modal.Body>
  <Modal.Footer><Button>OK</Button></Modal.Footer>
</Modal>
```

**6. Default props that work out of the box.**
The zero-config case should look great. Every prop should have a sensible default.

**7. Escape hatches for edge cases.**
`className`, `style`, and `...rest` spread on the root element. Don't lock consumers out.

```tsx
function Card({ children, className, ...rest }) {
  return (
    <div className={['card', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}
```

---

## Data Attribute Styling (vs. className variants)

Data attributes are cleaner than generated className variants for component states:

```tsx
// Component sets data attributes based on state
<button
  data-variant={variant}         // "primary" | "ghost" | "destructive"
  data-size={size}               // "sm" | "md" | "lg"
  data-loading={isLoading}       // true | undefined
  aria-disabled={disabled}
>

// CSS targets data attributes — no class name generation needed
.button[data-variant="primary"] { background: var(--color-accent); }
.button[data-size="sm"] { padding: var(--space-1) var(--space-2); }
.button[data-loading] { opacity: 0.7; cursor: wait; }
```

This separates JS state from CSS styling cleanly. Radix UI, Base UI, and Headless UI all use this pattern.

---

## Render Props (for complex sharing)

When a hook isn't enough and you need to share JSX structure:

```tsx
function DataFetcher<T>({ url, children }: {
  url: string;
  children: (state: { data: T | null; loading: boolean; error: Error | null }) => ReactNode;
}) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => { fetch(url).then(...) }, [url]);
  return <>{children(state)}</>;
}

// Usage
<DataFetcher url="/api/users">
  {({ data, loading, error }) => {
    if (loading) return <Skeleton />;
    if (error) return <ErrorState />;
    return <UserList users={data} />;
  }}
</DataFetcher>
```

---

## Composition over Configuration

The most maintainable components compose small primitives rather than configuring one large one.

```tsx
// Anti-pattern: one component that does everything
<DataTable
  columns={columns}
  data={data}
  pagination={true}
  sorting={true}
  filtering={true}
  rowSelection={true}
  onRowClick={handleClick}
  emptyState={<Empty />}
  loadingState={<Skeleton />}
  errorState={<Error />}
/>

// Composable: each concern is a small piece
<Table>
  <TableFilters />
  <TableBody columns={columns} data={data} onRowClick={handleClick}>
    <TableEmpty><Empty /></TableEmpty>
    <TableLoading><Skeleton /></TableLoading>
  </TableBody>
  <TablePagination />
</Table>
```

The composable version is more verbose at the call site but far easier to customise and maintain. Each sub-component can be replaced independently.

---

## Error Boundaries for UI Resilience

Wrap third-party content, complex visualisations, and unstable sections:

```tsx
class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Log to monitoring
    logger.error(error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div role="alert">
          <p>Something went wrong.</p>
          <button onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary fallback={<ChartError />}>
  <ComplexChart data={data} />
</ErrorBoundary>
```

## Animated Component Registries

The shadcn distribution model (shadcn/ui, Magic UI and their neighbors) copies component source into the project instead of adding a dependency. Three consequences matter:

- **The code is yours the moment it lands.** It ships under `components/`, it is versioned by your repo, and no upstream update will ever reach it. Audit it and fix it like any other file in the codebase — a flaw inherited from the registry is still your flaw in production.
- **Registry defaults are defaults.** Most animated registry components ship without a `prefers-reduced-motion` guard and with factory accent gradients. Pasting one is accepting those choices until you edit them: add the guard, bind the colors to your tokens.
- **The taxonomy is stable across libraries**: logo marquees, decorative backgrounds (SVG patterns, particles, WebGL), animated borders and beams, pointer-following spotlight cards, segmented text reveals, spring number tickers, device mockups and signature buttons. Knowing the families makes both building and auditing faster — and explains why unedited registry pages all look related.

Device mockups deserve one specific rule: prefer a pure SVG frame (server-renderable, zero hydration) over a bitmap screenshot or a client component.

## Resource hooks

- Component libraries and registries with caveats: `python3 tools/design-system/scripts/search.py "components" --domain resources`
- How established systems solve a pattern: `python3 tools/design-system/scripts/search.py "<pattern>" --domain design-systems`
