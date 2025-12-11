# SATUSEHAT DICOM Bridge

A simple desktop application built with Electron to send DICOM files to a SATUSEHAT-compatible DICOM router. This application allows users to select a DICOM file, add necessary metadata (Accession Number, Study Description), and send it to a configured DICOM router.

## Features

-   Select a DICOM file from your local filesystem.
-   Add or modify the following DICOM tags before sending:
    -   `(0008,0050)` Accession Number
    -   `(0008,1030)` Study Description
-   Configure the DICOM router's IP address, port, and AE Title.
-   Uses `dcmtk`'s `dcmodify` tool for robust DICOM tag modification.

## Prerequisites

Before you begin, ensure you have the following installed:

1.  **[Node.js](https://nodejs.org/)**: Required to run the application and install dependencies.
2.  **[dcmtk](https://dicom.offis.de/dcmtk.php.en)**: The `dcmodify` command must be available in your system's PATH. This application relies on `dcmtk` for all DICOM tag modifications.

## Installation

1.  Clone this repository to your local machine.
2.  Navigate to the project directory:
    ```bash
    cd satusehat-dicom-bridge
    ```
3.  Install the required npm packages:
    ```bash
    npm install
    ```

## How to Run

Once the dependencies are installed, you can start the application with:

```bash
npm start
```

This will launch the Electron application window.

## How to Use

1.  **Select a DICOM File**: Click the "Select DICOM File" button and choose the DICOM file you want to send.
2.  **Fill in Metadata**:
    -   Enter the **Accession Number** for the study.
    -   Enter a **Study Description**.
3.  **Configure Router**:
    -   Enter the **Router IP**, **Router Port**, and **Router AETitle** for your SATUSEHAT DICOM router.
    -   You can also set a custom **My AETitle** for this application.
4.  **Send the File**: Click the "Execute C-STORE & Send to Router" button to start the transfer.
