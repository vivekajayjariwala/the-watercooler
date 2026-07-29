'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Upload } from 'lucide-react'
import { PersonAvatar } from '@/components/kit/person-avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/utils/supabase/client'

const MAX_BYTES = 2 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

/**
 * Avatar picker. Uploads to the public `avatars` bucket under a per-user
 * folder — storage RLS requires the first path segment to be the uploader's
 * id, so the path shape here is load-bearing, not cosmetic.
 *
 * The resulting public URL is written into a hidden input, which means the
 * enclosing profile form is what actually persists it.
 */
export function AvatarField({
  userId,
  name,
  initialUrl,
  error,
}: {
  userId: string
  name: string | null
  initialUrl: string | null
  error?: string
}) {
  const [url, setUrl] = useState(initialUrl ?? '')
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Use a PNG, JPEG, WebP, or GIF.')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('Images need to be under 2 MB.')
      return
    }

    setUploading(true)
    const supabase = createClient()

    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'png'
    // Cache-busting filename: overwriting a fixed name leaves stale copies in
    // the CDN, and the avatar appears not to change.
    const path = `${userId}/${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    setUploading(false)

    if (uploadError) {
      console.error('[profile] avatar upload failed:', uploadError.message)
      toast.error('That image could not be uploaded. You can paste a URL instead.')
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(path)

    setUrl(publicUrl)
    toast.success('Avatar updated. Save to keep it.')
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="avatarUrl" value={url} />

      <div className="flex items-center gap-4">
        <PersonAvatar name={name} src={url || null} size="xl" />

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              {uploading ? 'Uploading…' : 'Upload image'}
            </Button>

            {url && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setUrl('')}
              >
                Remove
              </Button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            PNG, JPEG, WebP, or GIF · up to 2 MB
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void upload(file)
            event.target.value = ''
          }}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="avatar-url" className="label-mono">
          Or paste an image URL
        </label>
        <Input
          id="avatar-url"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://…"
          aria-invalid={Boolean(error)}
        />
        {error && (
          <p role="alert" className="text-[11px] text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
