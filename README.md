# SunbirdFileUploadLib

SunbirdFileUploadLib is a JavaScript library that simplifies the process of uploading files to various cloud providers, including Azure and AWS. It provides methods to handle both single-file uploads and chunked uploads for larger files. If an upload fails, the library supports retry functionality to resume the upload from where it left off.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
  - [Single-File Upload](#single-file-upload)
  - [Chunked Upload](#chunked-upload)
  - [Retry Upload](#retry-upload)
    
## Installation

You can install SunbirdFileUploadLib using npm:

`npm install sunbird-file-upload-lib`


## Usage

To use SunbirdFileUploadLib, you'll need to import the library and create an instance of the `SunbirdFileUploadLib` class. This class exposes methods for uploading files.

### Single-File Upload

Use the `upload` method to upload a single file to a cloud provider. You need to specify the `url`, `file`, and `csp` parameters.

```javascript
const SunbirdFileUploadLib = require('sunbird-file-upload-lib');

const uploader = new SunbirdFileUploadLib();

const url = 'https://example.com/upload'; // Replace with your upload URL
const file = document.getElementById('fileInput').files[0]; // Replace with your file input element
const csp = 'azure'; // Cloud provider (azure, aws, etc.)

uploader.upload(url, file, csp)
  .then(response => {
    console.log('Upload successful:', response);
  })
  .catch(error => {
    console.error('Upload failed:', error);
  });
```
### Chunked Upload
The library also supports chunked uploads for larger files. You can specify the maxFileSizeForChunking parameter to determine the file size threshold for chunked uploads. If the file size exceeds this threshold, it will be uploaded in chunks. By default, a threshold of 6 MB is used for Azure, but you can provide a different value.

```javascript
// Chunked upload with a custom threshold (e.g., 10 MB)
const maxFileSizeForChunking = 10 * 1024 * 1024; // 10 MB
uploader.upload(url, file, csp, maxFileSizeForChunking)
  .then(response => {
    console.log('Upload successful:', response);
  })
  .catch(error => {
    console.error('Upload failed:', error);
  });
```
### Retry Upload
In case an upload fails, you can use the retry method to resume the upload. This is especially useful for chunked uploads, as it will reinitiate the upload flow from the point of failure.

```javascript
// Retry upload
uploader.retry()
  .then(response => {
    console.log('Retry successful:', response);
  })
  .catch(error => {
    console.error('Retry failed:', error);
  });
```

