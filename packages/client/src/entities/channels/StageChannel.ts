import type { APIChannel, APIStageInstance } from "@volundr/types";
import { VoiceChannel } from "./VoiceChannel.js";
import type { Client } from "../../Client.js";

export class StageChannel extends VoiceChannel {
    topic!: string | null;

    constructor(client: Client, data: APIChannel) {
        super(client, data);
    }

    override _patch(data: Partial<APIChannel>): void {
        super._patch(data);
        if (data.topic !== undefined) this.topic = data.topic ?? null;
        else if (this.topic === undefined) this.topic = null;
    }

    /** Create a stage instance for this channel. */
    createStageInstance(topic: string, reason?: string): Promise<APIStageInstance> {
        return this.client.createStageInstance(this.id, topic, reason);
    }

    /** Edit the stage instance for this channel. */
    editStageInstance(topic: string, reason?: string): Promise<APIStageInstance> {
        return this.client.editStageInstance(this.id, topic, reason);
    }

    /** Delete the stage instance for this channel. */
    deleteStageInstance(reason?: string): Promise<void> {
        return this.client.deleteStageInstance(this.id, reason);
    }

    /** Get the stage instance for this channel. */
    getStageInstance(): Promise<APIStageInstance> {
        return this.client.getStageInstance(this.id);
    }
}
