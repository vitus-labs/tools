export type ComponentProps = {
  label: string
  onClick?: () => void
}

export const Component = ({ label, onClick }: ComponentProps) => (
  <button type="button" onClick={onClick}>
    {label}
  </button>
)
