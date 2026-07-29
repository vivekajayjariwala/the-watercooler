'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * A submit button wired to the enclosing form's pending state. Width is locked
 * while pending so the label swap doesn't reflow the row.
 */
export function SubmitButton({
  children,
  pendingText,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      className={cn('relative', className)}
      {...props}
    >
      {pending && <Loader2 className="size-3.5 animate-spin" />}
      {pending ? (pendingText ?? children) : children}
    </Button>
  )
}
