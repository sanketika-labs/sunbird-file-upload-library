

export class GCloudUploader {

    constructor(url, file, maxFileSizeChunking, emit) {
        this.url = url;
        this.file = file;
        this.emit = emit;
        this.currentFilePointer = 0;
        this.percentComplete = 0;
        this.bytesUploaded = 0;
        this.chunkSize = 5242880; // 5MB default chunk size
        this.timeStarted;
        this.retryChunkUploadLimit = 10;
        this.delayBetweenRetryCalls = 2000;
        this.maxFileSizeChunking = maxFileSizeChunking || 6;
        
        if (parseInt(this.file.size / 1e+6) <= this.maxFileSizeChunking) {
            this.upload()
        } else {
            this.uploadInChunks()
        }
    }

    getEstimatedSecondsLeft() {
        const timeElapsed = (new Date()) - this.timeStarted;
        const uploadSpeed = Math.floor(this.bytesUploaded / (timeElapsed / 1000)); // Upload speed in second
        const estimatedSecondsLeft = Math.round(((this.file.size - this.bytesUploaded) / uploadSpeed));
        return estimatedSecondsLeft;
    }

    retry() {
        this.uploadInChunks()
    }

    async fetchRetry(url, fetchOptions = {}, delay, limit) {
        let attempts = 0;
        while (attempts < limit) {
            try {
                const response = await fetch(url, fetchOptions);
                return response;
            } catch (error) {
                attempts++;
                if (attempts >= limit) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    handleErrors(response) {
        if (!response.ok) {
            throw Error(response.statusText);
        }
        return response;
    }

    async uploadInChunks() {
        this.timeStarted = (!this.timeStarted) ? new Date() : this.timeStarted;
        
        try {
            // Step 1: Initiate resumable upload session
            const initResp = await this.fetchRetry(this.url, {
                method: "POST",
                headers: {
                    "Content-Type": this.file.type,
                    "X-Goog-Resumable": "start"
                }
            }, this.delayBetweenRetryCalls, this.retryChunkUploadLimit);

            if (!initResp.ok) {
                throw new Error(`Failed to initiate resumable upload: ${initResp.statusText}`);
            }

            const uploadUrl = initResp.headers.get("Location");
            if (!uploadUrl) {
                throw new Error("No resumable upload URL returned from GCS");
            }

            // Step 2: Upload file in chunks
            await this.uploadChunksToUrl(uploadUrl);
        } catch (error) {
            this.emit("error", error);
        }
    }

    async uploadChunksToUrl(uploadUrl) {
        let offset = 0;
        this.bytesUploaded = 0;
        
        while (offset < this.file.size) {
            const chunk = this.file.slice(offset, offset + this.chunkSize);
            const chunkStart = offset;
            const chunkEnd = offset + chunk.size - 1;

            try {
                const response = await this.fetchRetry(uploadUrl, {
                    method: "PUT",
                    headers: {
                        "Content-Length": chunk.size,
                        "Content-Range": `bytes ${chunkStart}-${chunkEnd}/${this.file.size}`
                    },
                    body: chunk
                }, this.delayBetweenRetryCalls, this.retryChunkUploadLimit);

                if (response.status === 308) {
                    // Upload incomplete, continue with next chunk
                    this.bytesUploaded = chunkEnd + 1;
                    this.percentComplete = ((parseFloat(this.bytesUploaded) / parseFloat(this.file.size)) * 100).toFixed(2);
                    const estimated = this.getEstimatedSecondsLeft();
                    
                    this.emit("progress", {
                        "progress": this.percentComplete,
                        estimated
                    });
                } else if (response.ok) {
                    // Upload complete
                    this.percentComplete = 100;
                    this.emit("progress", { "progress": 100 });
                    this.emit("completed", { status: response.status });
                    return;
                } else {
                    throw new Error(`Chunk upload failed with status: ${response.status}`);
                }

                offset += chunk.size;
            } catch (error) {
                this.emit("error", error);
                return;
            }
        }
    }
    upload = async () => {
        try {
            this.timeStarted = new Date();
            
            // Step 1: Initiate resumable upload session
            const initResp = await this.fetchRetry(this.url, {
                method: "POST",
                headers: {
                    "Content-Type": this.file.type,
                    "X-Goog-Resumable": "start"
                }
            }, this.delayBetweenRetryCalls, this.retryChunkUploadLimit);

            if (!initResp.ok) {
                throw new Error(`Failed to initiate resumable upload: ${initResp.statusText}`);
            }

            const uploadUrl = initResp.headers.get("Location");
            if (!uploadUrl) {
                throw new Error("No resumable upload URL returned from GCS");
            }

            // Step 2: Upload entire file in one PUT
            const uploadResp = await this.fetchRetry(uploadUrl, {
                method: "PUT",
                headers: {
                    "Content-Length": this.file.size,
                    "Content-Range": `bytes 0-${this.file.size - 1}/${this.file.size}`
                },
                body: this.file
            }, this.delayBetweenRetryCalls, this.retryChunkUploadLimit);

            if (uploadResp.ok) {
                this.emit('progress', { progress: 100 });
                this.emit('completed', { status: uploadResp.status });
            } else {
                throw new Error(`Upload failed: ${uploadResp.status} ${uploadResp.statusText}`);
            }
        } catch (error) {
            this.emit('error', error);
        }
    }
}


