import { QUALITY_POLL_INTERVAL, QUALITY_UPGRADE_DELAY, QUALITY_HISTORY_SIZE } from './constants';
import type { ConnectionQuality, QualityTier } from './types';

interface QualitySnapshot {
  rtt: number;
  packetLoss: number;
  jitter: number;
  availableBandwidth: number;
  timestamp: number;
}

export type QualityUpdateHandler = (quality: ConnectionQuality) => void;
export type TierChangeHandler = (tier: QualityTier) => void;

/**
 * Monitors WebRTC connection quality by polling getStats() and
 * selecting the appropriate adaptive bitrate tier.
 */
export class QualityMonitor {
  private pc: RTCPeerConnection;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private history: QualitySnapshot[] = [];
  private currentTier: QualityTier = 'high';
  private lastUpgradeCheck = 0;
  private prevBytesReceived = 0;
  private prevTimestamp = 0;

  onQualityUpdate: QualityUpdateHandler = () => {};
  onTierChange: TierChangeHandler = () => {};

  constructor(pc: RTCPeerConnection) {
    this.pc = pc;
  }

  start(): void {
    if (this.intervalId !== null) return; // Guard against double start
    this.intervalId = setInterval(() => this.poll(), QUALITY_POLL_INTERVAL);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getCurrentTier(): QualityTier {
    return this.currentTier;
  }

  private async poll(): Promise<void> {
    try {
      const stats = await this.pc.getStats();
      const snapshot = this.extractMetrics(stats);
      if (!snapshot) return;

      this.history.push(snapshot);
      if (this.history.length > QUALITY_HISTORY_SIZE) {
        this.history.shift();
      }

      const avg = this.averageMetrics();
      const score = this.computeScore(avg);
      const newTier = this.selectTier(avg);

      const quality: ConnectionQuality = {
        tier: this.currentTier,
        score,
        rtt: avg.rtt,
        packetLoss: avg.packetLoss,
        jitter: avg.jitter,
        availableBandwidth: avg.availableBandwidth,
      };

      // Apply tier change with hysteresis
      if (newTier !== this.currentTier) {
        const tierOrder: QualityTier[] = ['audio-only', 'low', 'medium', 'high'];
        const currentIdx = tierOrder.indexOf(this.currentTier);
        const newIdx = tierOrder.indexOf(newTier);

        if (newIdx < currentIdx) {
          // Downgrade immediately
          this.currentTier = newTier;
          quality.tier = newTier;
          this.onTierChange(newTier);
          this.lastUpgradeCheck = Date.now();
        } else if (Date.now() - this.lastUpgradeCheck >= QUALITY_UPGRADE_DELAY) {
          // Upgrade only after sustained good metrics
          this.currentTier = newTier;
          quality.tier = newTier;
          this.onTierChange(newTier);
          this.lastUpgradeCheck = Date.now();
        }
      }

      this.onQualityUpdate(quality);
    } catch {
      // Stats collection can fail if connection is closing
    }
  }

  private extractMetrics(stats: RTCStatsReport): QualitySnapshot | null {
    let rtt = 0;
    let packetLoss = 0;
    let jitter = 0;
    let availableBandwidth = 0;

    for (const report of stats.values()) {
      if (report.type === 'candidate-pair' && (report as Record<string, unknown>).state === 'succeeded') {
        const pair = report as Record<string, unknown>;
        rtt = ((pair.currentRoundTripTime as number) ?? 0) * 1000; // Convert to ms
        availableBandwidth = (pair.availableOutgoingBitrate as number) ?? 0;
      }

      if (report.type === 'remote-inbound-rtp') {
        const rtp = report as Record<string, unknown>;
        // Use fractionLost (0.0-1.0) from remote-inbound-rtp — standardized and
        // available in Chrome (unlike packetsReceived which Chrome omits here)
        const fractionLost = rtp.fractionLost as number | undefined;
        if (fractionLost !== undefined && fractionLost >= 0) {
          packetLoss = fractionLost;
        } else {
          // Fallback: compute from cumulative counters
          const lost = (rtp.packetsLost as number) ?? 0;
          const received = (rtp.packetsReceived as number) ?? 0;
          if (lost + received > 0) {
            packetLoss = lost / (lost + received);
          }
        }
        jitter = ((rtp.jitter as number) ?? 0) * 1000; // Convert to ms
      }

      // Estimate bandwidth from inbound-rtp if candidate-pair doesn't provide it
      if (report.type === 'inbound-rtp' && availableBandwidth === 0) {
        const rtp = report as Record<string, unknown>;
        const bytesReceived = (rtp.bytesReceived as number) ?? 0;
        const timestamp = (rtp.timestamp as number) ?? 0;
        if (this.prevBytesReceived > 0 && this.prevTimestamp > 0) {
          const dt = (timestamp - this.prevTimestamp) / 1000;
          if (dt > 0) {
            availableBandwidth = ((bytesReceived - this.prevBytesReceived) * 8) / dt;
          }
        }
        this.prevBytesReceived = bytesReceived;
        this.prevTimestamp = timestamp;
      }
    }

    return { rtt, packetLoss, jitter, availableBandwidth, timestamp: Date.now() };
  }

  private averageMetrics(): QualitySnapshot {
    if (this.history.length === 0) {
      return { rtt: 0, packetLoss: 0, jitter: 0, availableBandwidth: 0, timestamp: Date.now() };
    }
    const sum = this.history.reduce(
      (acc, s) => ({
        rtt: acc.rtt + s.rtt,
        packetLoss: acc.packetLoss + s.packetLoss,
        jitter: acc.jitter + s.jitter,
        availableBandwidth: acc.availableBandwidth + s.availableBandwidth,
        timestamp: Date.now(),
      }),
      { rtt: 0, packetLoss: 0, jitter: 0, availableBandwidth: 0, timestamp: Date.now() },
    );
    const n = this.history.length;
    return {
      rtt: sum.rtt / n,
      packetLoss: sum.packetLoss / n,
      jitter: sum.jitter / n,
      availableBandwidth: sum.availableBandwidth / n,
      timestamp: Date.now(),
    };
  }

  private computeScore(avg: QualitySnapshot): number {
    const rttScore = Math.max(0, 100 - avg.rtt / 5);
    const lossScore = Math.max(0, 100 - avg.packetLoss * 1000);
    const jitterScore = Math.max(0, 100 - avg.jitter * 2);
    return Math.round(rttScore * 0.3 + lossScore * 0.4 + jitterScore * 0.3);
  }

  private selectTier(avg: QualitySnapshot): QualityTier {
    if (avg.packetLoss > 0.10 || avg.rtt > 500) return 'audio-only';
    if (avg.packetLoss > 0.05 || avg.rtt > 300) return 'low';
    if (avg.packetLoss > 0.02 || avg.rtt > 150) return 'medium';
    return 'high';
  }
}
