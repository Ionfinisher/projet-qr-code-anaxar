import {
    Document,
    Image as PdfImage,
    Page,
    StyleSheet,
    pdf,
} from '@react-pdf/renderer';

const pdfStyles = StyleSheet.create({
    page: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
    },
    image: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
});

export function PassPdf({ image }) {
    return (
        <Document>
            <Page size="A4" style={pdfStyles.page}>
                <PdfImage src={image} style={pdfStyles.image} />
            </Page>
        </Document>
    );
}

export function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') resolve(reader.result);
            else reject(new Error('Could not read the pass PNG.'));
        };
        reader.onerror = () => reject(reader.error || new Error('Could not read the pass PNG.'));
        reader.readAsDataURL(blob);
    });
}