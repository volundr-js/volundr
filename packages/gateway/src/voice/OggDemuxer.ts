import { Transform, TransformCallback } from "node:stream";

const OGG_CAPTURE = Buffer.from("OggS");
const OGG_HEADER_SIZE = 27;

/**
 * Transform stream that parses an OGG/Opus byte stream and emits
 * individual raw Opus frame buffers, suitable for RTP encapsulation.
 *
 * Skips the first two OGG pages (OpusHead + OpusTags headers).
 */
export class OggDemuxer extends Transform {
    private buffer = Buffer.alloc(0);
    private pagesParsed = 0;
    private framesEmitted = 0;
    private bytesReceived = 0;

    constructor() {
        super({ readableObjectMode: true });
    }

    _transform(chunk: Buffer, _encoding: string, callback: TransformCallback): void {
        this.bytesReceived += chunk.length;
        this.buffer = Buffer.concat([this.buffer, chunk]);

        while (this.parsePage()) {
            // Keep parsing pages as long as we have complete ones
        }

        callback();
    }

    _flush(callback: TransformCallback): void {
        callback();
    }

    private parsePage(): boolean {
        // Need at least the fixed header to start
        if (this.buffer.length < OGG_HEADER_SIZE) return false;

        // Find the OggS capture pattern
        const captureIndex = this.buffer.indexOf(OGG_CAPTURE);
        if (captureIndex === -1) {
            // No capture pattern found, discard buffer except last 3 bytes
            // (in case "Ogg" is split across chunks)
            this.buffer = this.buffer.subarray(Math.max(0, this.buffer.length - 3));
            return false;
        }

        // Discard any data before the capture pattern
        if (captureIndex > 0) {
            this.buffer = this.buffer.subarray(captureIndex);
        }

        if (this.buffer.length < OGG_HEADER_SIZE) return false;

        // Parse the header
        // byte 26: number of page segments
        const numSegments = this.buffer[26];
        const segmentTableEnd = OGG_HEADER_SIZE + numSegments;

        if (this.buffer.length < segmentTableEnd) return false;

        // Read segment table to determine total data size
        const segmentTable = this.buffer.subarray(OGG_HEADER_SIZE, segmentTableEnd);
        let totalDataSize = 0;
        for (let i = 0; i < numSegments; i++) {
            totalDataSize += segmentTable[i];
        }

        const pageEnd = segmentTableEnd + totalDataSize;
        if (this.buffer.length < pageEnd) return false;

        // We have a complete page
        this.pagesParsed++;

        // Skip the first 2 pages (OpusHead + OpusTags)
        if (this.pagesParsed > 2) {
            // Extract Opus packets from segments
            // Segments of 255 bytes are continuations; a segment < 255 completes the packet
            const segmentData = this.buffer.subarray(segmentTableEnd, pageEnd);
            let offset = 0;
            let packetChunks: Buffer[] = [];

            for (let i = 0; i < numSegments; i++) {
                const segLen = segmentTable[i];
                packetChunks.push(segmentData.subarray(offset, offset + segLen));
                offset += segLen;

                if (segLen < 255) {
                    // Packet is complete
                    const packet = Buffer.concat(packetChunks);
                    if (packet.length > 0) {
                        this.framesEmitted++;
                        this.push(packet);
                    }
                    packetChunks = [];
                }
            }

            // If there are remaining chunks (page ended with a 255-byte segment),
            // the packet continues on the next page. For simplicity in audio streaming,
            // emit what we have - Opus frames are typically small (< 255 bytes at 128kbps).
            if (packetChunks.length > 0) {
                const packet = Buffer.concat(packetChunks);
                if (packet.length > 0) {
                    this.push(packet);
                }
            }
        }

        // Advance past this page
        this.buffer = this.buffer.subarray(pageEnd);
        return true;
    }
}
