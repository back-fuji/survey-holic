/**
 * TikTok Content Posting API integration.
 * Docs: https://developers.tiktok.com/doc/content-posting-api-get-started/
 *
 * Flow:
 * 1. Initialize video upload → get upload_url + publish_id
 * 2. Upload video binary to upload_url
 * 3. Check publish status via publish_id
 *
 * Note: Direct Post requires video file. For now we support:
 * - Direct Post (video file upload)
 * - Post to Inbox (draft sharing)
 */

import type { TikTokPublishResult } from "@/types";

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

interface TikTokTokens {
  accessToken: string;
}

interface VideoPublishOptions {
  videoPath?: string;       // local file path (server-side)
  videoUrl?: string;        // publicly accessible URL for pull upload
  title: string;
  description?: string;
  hashtags?: string[];
  privacyLevel?: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY";
  disableDuet?: boolean;
  disableStitch?: boolean;
  disableComment?: boolean;
  brandContentToggle?: boolean;
  brandOrganicToggle?: boolean;
}

export class TikTokClient {
  private accessToken: string;

  constructor(tokens: TikTokTokens) {
    this.accessToken = tokens.accessToken;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    };
  }

  /** Get creator info and available publishing options */
  async getCreatorInfo(): Promise<{
    creatorNickname: string;
    creatorAvatarUrl: string;
    privacyLevelOptions: string[];
    commentDisabled: boolean;
    duetDisabled: boolean;
    stitchDisabled: boolean;
    maxVideoPostDuration: number;
  }> {
    const res = await fetch(
      `${TIKTOK_API_BASE}/post/publish/creator_info/query/`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({}),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`TikTok creator info failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    const info = data.data;
    return {
      creatorNickname: info.creator_nickname,
      creatorAvatarUrl: info.creator_avatar_url,
      privacyLevelOptions: info.privacy_level_options ?? [],
      commentDisabled: info.comment_disabled ?? false,
      duetDisabled: info.duet_disabled ?? false,
      stitchDisabled: info.stitch_disabled ?? false,
      maxVideoPostDuration: info.max_video_post_duration_sec ?? 60,
    };
  }

  /**
   * Initialize a video upload via URL pull (simplest for server-side).
   * Returns publish_id for status polling.
   */
  async initVideoUploadByUrl(
    options: VideoPublishOptions & { videoUrl: string }
  ): Promise<{ publishId: string; uploadUrl?: string }> {
    const hashtagText = options.hashtags
      ? options.hashtags.map((h) => `#${h}`).join(" ")
      : "";
    const fullTitle = [options.title, hashtagText]
      .filter(Boolean)
      .join(" ")
      .slice(0, 150);

    const body = {
      post_info: {
        title: fullTitle,
        privacy_level: options.privacyLevel ?? "SELF_ONLY",
        disable_duet: options.disableDuet ?? false,
        disable_stitch: options.disableStitch ?? false,
        disable_comment: options.disableComment ?? false,
        video_cover_timestamp_ms: 1000,
        brand_content_toggle: options.brandContentToggle ?? false,
        brand_organic_toggle: options.brandOrganicToggle ?? false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: options.videoUrl,
      },
    };

    const res = await fetch(
      `${TIKTOK_API_BASE}/post/publish/video/init/`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`TikTok upload init failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    return {
      publishId: data.data.publish_id,
    };
  }

  /** Check publish status */
  async checkPublishStatus(publishId: string): Promise<{
    status: "PROCESSING_UPLOAD" | "PUBLISH_COMPLETE" | "FAILED" | "PROCESSING_DOWNLOAD";
    publiclyAvailable: boolean;
    shareUrl?: string;
    failReason?: string;
  }> {
    const res = await fetch(
      `${TIKTOK_API_BASE}/post/publish/status/fetch/`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ publish_id: publishId }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`TikTok status check failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    const status = data.data;
    return {
      status: status.status,
      publiclyAvailable: status.publicly_available ?? false,
      shareUrl: status.share_url,
      failReason: status.fail_reason,
    };
  }

  /**
   * High-level: publish video by URL and poll for completion.
   * Polls up to maxPolls times with pollInterval ms between polls.
   */
  async publishByUrl(
    options: VideoPublishOptions & { videoUrl: string },
    pollOptions: { maxPolls?: number; pollInterval?: number } = {}
  ): Promise<TikTokPublishResult> {
    const { maxPolls = 10, pollInterval = 5000 } = pollOptions;

    try {
      const { publishId } = await this.initVideoUploadByUrl(options);

      for (let i = 0; i < maxPolls; i++) {
        await sleep(pollInterval);
        const status = await this.checkPublishStatus(publishId);

        if (status.status === "PUBLISH_COMPLETE") {
          return {
            success: true,
            postId: publishId,
            shareUrl: status.shareUrl,
          };
        }

        if (status.status === "FAILED") {
          return {
            success: false,
            error: status.failReason ?? "Unknown TikTok publish failure",
          };
        }
        // PROCESSING_UPLOAD or PROCESSING_DOWNLOAD → continue polling
      }

      return {
        success: false,
        error: "Publish timed out after polling limit",
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Create a TikTok client from environment variables */
export function createTikTokClient(): TikTokClient {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  if (!accessToken) throw new Error("TIKTOK_ACCESS_TOKEN is not set");
  return new TikTokClient({ accessToken });
}
