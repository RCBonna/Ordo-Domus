import { describe, expect, it } from 'vitest';
import {
  RATE_LIMIT_DEFAULTS,
  evaluateAiExtractionPayload,
  getBase64ByteLength,
  normalizeMimeType,
} from './limits';

describe('AI extraction limits', () => {
  it('accepts a normal receipt payload', () => {
    const result = evaluateAiExtractionPayload('receipt', {
      imageBase64: 'aGVsbG8=',
      mimeType: 'image/webp',
    }, RATE_LIMIT_DEFAULTS.receipt);

    expect(result).toEqual({ allowed: true, payloadBytes: 5 });
  });

  it('accepts a normal snapshot payload', () => {
    const result = evaluateAiExtractionPayload('snapshot', {
      imageBase64: 'aGVsbG8=',
      mimeType: 'image/webp',
    }, RATE_LIMIT_DEFAULTS.snapshot);

    expect(result).toEqual({ allowed: true, payloadBytes: 5 });
  });

  it('blocks an unsupported snapshot MIME before model execution', () => {
    const result = evaluateAiExtractionPayload('snapshot', {
      imageBase64: 'aGVsbG8=',
      mimeType: 'application/octet-stream',
    }, RATE_LIMIT_DEFAULTS.snapshot);

    expect(result).toMatchObject({
      allowed: false,
      reason: 'invalid_snapshot_mime',
      status: 415,
    });
  });

  it('blocks snapshot payloads over the configured byte limit', () => {
    const result = evaluateAiExtractionPayload('snapshot', {
      imageBase64: 'aGVsbG8=',
      mimeType: 'image/webp',
    }, {
      ...RATE_LIMIT_DEFAULTS.snapshot,
      maxPayloadBytes: 4,
    });

    expect(result).toMatchObject({
      allowed: false,
      reason: 'payload_too_large',
      status: 413,
    });
  });

  it('blocks an unsupported audio MIME before model execution', () => {
    const result = evaluateAiExtractionPayload('audio', {
      audioBase64: 'aGVsbG8=',
      mimeType: 'application/octet-stream',
    }, RATE_LIMIT_DEFAULTS.audio);

    expect(result).toMatchObject({
      allowed: false,
      reason: 'invalid_audio_mime',
      status: 415,
    });
  });

  it('blocks text over the configured character limit', () => {
    const result = evaluateAiExtractionPayload('text', {
      text: 'abcd',
    }, {
      ...RATE_LIMIT_DEFAULTS.text,
      maxChars: 3,
    });

    expect(result).toMatchObject({
      allowed: false,
      reason: 'text_too_long',
      status: 413,
    });
  });

  it('normalizes MIME parameters and calculates base64 byte length', () => {
    expect(normalizeMimeType('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(getBase64ByteLength('aGVsbG8=')).toBe(5);
  });
});
