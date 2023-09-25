<?php

namespace App\Mail;

use App\Services\System\TranslationsService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\App;

class BasicMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public const TYPE_TEST = 'test';

    /**
     * Create a new message instance.
     */
    public function __construct(
        private readonly string $type,
    ) {
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: TranslationsService::mailTranslation($this->type . '.title'),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'email.' . App::getLocale() . '.' . $this->type,
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
