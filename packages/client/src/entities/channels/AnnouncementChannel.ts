import type { APIChannel } from "@volundr/types";
import { TextChannel } from "./TextChannel.js";
import type { Client } from "../../Client.js";

export class AnnouncementChannel extends TextChannel {
    constructor(client: Client, data: APIChannel) {
        super(client, data);
    }
}
