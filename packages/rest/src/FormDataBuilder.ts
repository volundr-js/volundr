export interface FileAttachment {
    name: string;
    data: Buffer | Uint8Array | Blob;
    contentType?: string;
}

export function buildFormData(jsonBody: unknown, files: FileAttachment[]): FormData {
    const formData = new FormData();

    formData.set("payload_json", JSON.stringify(jsonBody));

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const blob = file.data instanceof Blob
            ? file.data
            : new Blob([file.data as BlobPart], { type: file.contentType ?? "application/octet-stream" });
        formData.set(`files[${i}]`, blob, file.name);
    }

    return formData;
}
