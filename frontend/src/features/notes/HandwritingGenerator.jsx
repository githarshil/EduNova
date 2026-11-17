import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool,
  Download,
  FileText,
  Camera,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  PaperCard,
  Pin,
  StickyNote,
  Field,
  Button,
  resolveCssVar,
} from '../../components/ui';

const FONTS = [
  { id: 'Caveat', name: 'Caveat (Notebook Cursive)' },
  { id: 'Kalam', name: 'Kalam (Devanagari / Indian Print)' },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta (Neat Print)' },
];

const PAPER_STYLES = [
  { id: 'ruled', name: 'Ruled Notebook (Blue Lines + Red Margin)' },
  { id: 'plain', name: 'Plain Cream Paper' },
  { id: 'graph', name: 'Graph / Coordinate Grid Paper' },
  { id: 'parchment', name: 'Legal Yellow Pad' },
];

const INK_OPTIONS = [
  { id: 'blue', token: '--physics-ink', name: 'Classic Blue Ink' },
  { id: 'black', token: '--ink', name: 'Ballpoint Black Ink' },
  { id: 'red', token: '--red-600', name: 'Red Correction Ink' },
  { id: 'emerald', token: '--emerald-800', name: 'Emerald Ink' },
];

export default function HandwritingGenerator({ initialText = '', initialTitle = '', onSaveNote }) {
  const [text, setText] = useState(
    initialText ||
      "Ohm's Law:\nAt constant temperature, the current flowing through a conductor is directly proportional to the potential difference across its ends.\n\nV = I × R\n\nWhere:\n• V = Potential Difference (Volts)\n• I = Electric Current (Amperes)\n• R = Resistance (Ohms Ω)"
  );
  const [title, setTitle] = useState(initialTitle || "Ohm's Law Handwritten Notes");
  const [subject, setSubject] = useState('Physics');

  const [font, setFont] = useState('Caveat');
  const [fontSize, setFontSize] = useState(24);
  const [lineSpacing, setLineSpacing] = useState(32);
  const [paperStyle, setPaperStyle] = useState('ruled');
  const [inkChoice, setInkChoice] = useState('blue');
  const [humanJitter, setHumanJitter] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMessage, setOcrMessage] = useState(null);
  const [savingNote, setSavingNote] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  /**
   * Renders a specific notebook page onto a target canvas (visible or offscreen)
   */
  const drawPageToCanvas = (targetCanvas, pageToDraw) => {
    if (!targetCanvas) return 1;

    const ctx = targetCanvas.getContext('2d');
    const PAGE_WIDTH = 794;
    const PAGE_HEIGHT = 1123;
    targetCanvas.width = PAGE_WIDTH;
    targetCanvas.height = PAGE_HEIGHT;

    const paperFill =
      paperStyle === 'parchment'
        ? resolveCssVar('--note-yellow')
        : resolveCssVar('--paper');
    ctx.fillStyle = paperFill;
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

    if (paperStyle === 'graph') {
      ctx.strokeStyle = resolveCssVar('--paper-border-warm');
      ctx.lineWidth = 1;
      const gridSize = 25;
      for (let x = 0; x < PAGE_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, PAGE_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < PAGE_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(PAGE_WIDTH, y);
        ctx.stroke();
      }
    }

    const marginTop = 76;
    const marginLeft = paperStyle === 'ruled' ? 88 : 56;
    const marginRight = 48;
    const marginBottom = 60;

    if (paperStyle === 'ruled' || paperStyle === 'parchment') {
      ctx.strokeStyle = resolveCssVar('--paper-rule');
      ctx.lineWidth = 1.2;
      for (let y = marginTop; y < PAGE_HEIGHT - marginBottom; y += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(PAGE_WIDTH, y);
        ctx.stroke();
      }

      if (paperStyle === 'ruled') {
        ctx.strokeStyle = resolveCssVar('--paper-margin');
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(marginLeft - 16, 0);
        ctx.lineTo(marginLeft - 16, PAGE_HEIGHT);
        ctx.stroke();
      }
    }

    const selectedInkObj = INK_OPTIONS.find((item) => item.id === inkChoice) || INK_OPTIONS[0];
    ctx.font = `${fontSize}px "${font}", cursive, sans-serif`;
    ctx.fillStyle = resolveCssVar(selectedInkObj.token);
    ctx.textBaseline = 'alphabetic';

    const maxLineWidth = PAGE_WIDTH - marginLeft - marginRight;
    const lines = [];

    const rawParagraphs = text.split('\n');
    for (const p of rawParagraphs) {
      if (p.trim() === '') {
        lines.push('');
        continue;
      }
      const words = p.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width > maxLineWidth) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
    }

    const linesPerPage = Math.max(
      1,
      Math.floor((PAGE_HEIGHT - marginTop - marginBottom) / lineSpacing)
    );
    const calculatedPages = Math.max(1, Math.ceil(lines.length / linesPerPage));

    const safePage = Math.min(Math.max(1, pageToDraw), calculatedPages);
    const startIndex = (safePage - 1) * linesPerPage;
    const pageLines = lines.slice(startIndex, startIndex + linesPerPage);

    let y = marginTop;
    pageLines.forEach((line, lineIndex) => {
      if (line) {
        let x = marginLeft;
        const words = line.split(' ');
        words.forEach((word, wordIndex) => {
          const baselineOffset = humanJitter
            ? Math.sin((lineIndex * 7 + wordIndex) * 1.5) * 1.4
            : 0;
          const rotationAngle = humanJitter
            ? Math.cos((lineIndex * 5 + wordIndex) * 2) * 0.008
            : 0;

          ctx.save();
          ctx.translate(x, y + baselineOffset);
          if (rotationAngle !== 0) ctx.rotate(rotationAngle);
          ctx.fillText(word, 0, 0);
          ctx.restore();

          x += ctx.measureText(`${word} `).width;
        });
      }
      y += lineSpacing;
    });

    ctx.font = `14px "${font}", cursive, sans-serif`;
    ctx.fillStyle = resolveCssVar('--ink-soft');
    ctx.fillText(
      `Page ${safePage} of ${calculatedPages}`,
      PAGE_WIDTH - 120,
      PAGE_HEIGHT - 30
    );

    return calculatedPages;
  };

  useEffect(() => {
    const calcPages = drawPageToCanvas(canvasRef.current, currentPage);
    if (calcPages && calcPages !== totalPages) {
      setTotalPages(calcPages);
    }
  }, [text, font, fontSize, lineSpacing, paperStyle, inkChoice, humanJitter, currentPage]);

  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_page_${currentPage}.png`;
    a.click();
  };

  const handleDownloadPDF = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Collect high-resolution page images for all pages in this handwritten note
    const pageDataUrls = [];
    const offscreen = document.createElement('canvas');

    for (let p = 1; p <= totalPages; p++) {
      if (p === currentPage) {
        pageDataUrls.push(canvas.toDataURL('image/png'));
      } else {
        drawPageToCanvas(offscreen, p);
        pageDataUrls.push(offscreen.toDataURL('image/png'));
      }
    }

    const cleanTitle = (title || 'Handwritten_Note').replace(/[^\w\s-]/g, '').trim();

    // Create an isolated iframe to print ONLY the notebook page preview(s), never the website shell
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();

    const pagesHtml = pageDataUrls
      .map(
        (src, idx) => `
        <div class="note-print-sheet">
          <img src="${src}" alt="Page ${idx + 1}" />
        </div>
      `
      )
      .join('');

    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${cleanTitle}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              width: 100%;
              background: #ffffff;
            }
            .note-print-sheet {
              width: 100vw;
              height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              page-break-after: always;
              break-after: page;
            }
            .note-print-sheet:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            img {
              max-width: 100%;
              max-height: 100%;
              width: auto;
              height: auto;
              display: block;
              margin: 0 auto;
              object-fit: contain;
            }
            @media print {
              html, body {
                width: 210mm;
                height: 297mm;
              }
              .note-print-sheet {
                width: 210mm;
                height: 297mm;
                margin: 0;
                padding: 0;
                page-break-inside: avoid;
                break-inside: avoid;
              }
              img {
                width: 210mm;
                height: 297mm;
                object-fit: contain;
              }
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
        </body>
      </html>
    `);
    doc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Print preview error:', err);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    };

    setTimeout(triggerPrint, 200);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setOcrLoading(true);
      setOcrMessage(null);

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch('/api/notes/ocr', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(localStorage.getItem('token') && {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              }),
            },
            body: JSON.stringify({
              imageBase64: reader.result,
              mimeType: file.type || 'image/jpeg',
            }),
          });

          const data = await res.json();
          if (data.success && data.text) {
            setText(data.text);
            setOcrMessage({
              type: 'success',
              text: 'Handwritten notes transcribed! Review and format below.',
            });
          } else {
            setOcrMessage({
              type: 'error',
              text: data.message || 'Failed to transcribe image.',
            });
          }
        } catch {
          setOcrMessage({ type: 'error', text: 'Network error performing OCR.' });
        } finally {
          setOcrLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setOcrLoading(false);
    }
  };

  const handleSaveToNotes = async () => {
    try {
      setSavingNote(true);
      setSaveStatus(null);

      const canvas = canvasRef.current;
      const imageUrl = canvas ? canvas.toDataURL('image/png') : null;

      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') && {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          }),
        },
        body: JSON.stringify({
          title: title || 'Handwritten Notes',
          content: text,
          subject,
          handwritingConfig: { font, fontSize, lineSpacing, paperStyle, inkColor: inkChoice },
          handwritingImageUrl: imageUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveStatus({
          type: 'success',
          text: 'Saved to your personal notes and embedded into Chotu knowledge base!',
        });
        if (onSaveNote) onSaveNote(data.note);
      } else {
        setSaveStatus({ type: 'error', text: data.message || 'Failed to save note' });
      }
    } catch {
      setSaveStatus({ type: 'error', text: 'Error saving note to database' });
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div
      className="paper-grid paper-grid--split"
      style={{
        gridTemplateColumns: 'minmax(280px, 1fr) minmax(300px, 1.15fr)',
        alignItems: 'start',
      }}
    >
      {/* Left: Editor & Ink Controls */}
      <PaperCard flat style={{ padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
        <Pin color="blue" position="left" />

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <h2 className="type-h3" style={{ color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PenTool size={18} strokeWidth={2} style={{ color: 'var(--emerald-700)' }} aria-hidden="true" />
            Text-to-Handwriting Studio
          </h2>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <Button
              variant="note"
              size="sm"
              disabled={ocrLoading}
              onClick={() => fileInputRef.current?.click()}
            >
              {ocrLoading ? <Loader2 size={14} aria-hidden="true" /> : <Camera size={14} strokeWidth={2} aria-hidden="true" />}
              OCR Photo Notes
            </Button>
          </div>
        </div>

        {ocrMessage ? (
          <StickyNote tone={ocrMessage.type === 'success' ? 'green' : 'pink'} body style={{ maxWidth: '100%' }}>
            {ocrMessage.text}
          </StickyNote>
        ) : null}

        <div className="paper-grid paper-grid--2" style={{ gap: 'var(--sp-3)' }}>
          <Field
            label="Note Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Newton's Second Law Notes"
          />

          <Field
            as="select"
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Biology">Biology</option>
            <option value="Mathematics">Mathematics</option>
          </Field>
        </div>

        <Field
          as="textarea"
          label={`Note Content (${text.length} chars)`}
          rows={9}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your notes here or use OCR to scan handwritten notebooks..."
        />

        <div
          className="paper-grid paper-grid--2"
          style={{
            gap: 'var(--sp-3)',
            padding: 'var(--sp-3)',
            background: 'var(--paper-warm)',
            border: '1px solid var(--paper-border-warm)',
            borderRadius: 'var(--r-md)',
          }}
        >
          <Field as="select" label="Handwriting Font" value={font} onChange={(e) => setFont(e.target.value)}>
            {FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Field>

          <Field as="select" label="Paper Style" value={paperStyle} onChange={(e) => setPaperStyle(e.target.value)}>
            {PAPER_STYLES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Field>

          <div>
            <span className="field__label" style={{ display: 'block', marginBottom: '6px' }}>
              Ink Color
            </span>
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              {INK_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setInkChoice(c.id)}
                  title={c.name}
                  aria-label={c.name}
                  aria-pressed={inkChoice === c.id ? 'true' : 'false'}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: `var(${c.token})`,
                    border: inkChoice === c.id ? '3px solid var(--amber-400)' : '2px solid var(--paper-edge)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <Button
              variant={humanJitter ? 'primary' : 'note'}
              size="sm"
              onClick={() => setHumanJitter((v) => !v)}
            >
              {humanJitter ? 'Human Jitter: ON' : 'Uniform Baseline'}
            </Button>
          </div>

          <label className="field">
            <span className="field__label">Font Size ({fontSize}px)</span>
            <input
              type="range"
              min="18"
              max="32"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              style={{ accentColor: 'var(--emerald-700)' }}
            />
          </label>

          <label className="field">
            <span className="field__label">Line Spacing ({lineSpacing}px)</span>
            <input
              type="range"
              min="26"
              max="44"
              value={lineSpacing}
              onChange={(e) => setLineSpacing(Number(e.target.value))}
              style={{ accentColor: 'var(--emerald-700)' }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
          <Button variant="note" size="sm" onClick={handleDownloadPNG}>
            <Download size={15} strokeWidth={2} aria-hidden="true" />
            Export PNG
          </Button>
          <Button variant="note" size="sm" onClick={handleDownloadPDF}>
            <FileText size={15} strokeWidth={2} aria-hidden="true" />
            Print / PDF
          </Button>
          <Button variant="primary" size="sm" onClick={handleSaveToNotes} disabled={savingNote}>
            <Sparkles size={15} strokeWidth={2} aria-hidden="true" />
            {savingNote ? 'Saving...' : 'Save to My Notes'}
          </Button>
        </div>

        {saveStatus ? (
          <StickyNote tone={saveStatus.type === 'success' ? 'green' : 'pink'} body style={{ maxWidth: '100%' }}>
            {saveStatus.text}
          </StickyNote>
        ) : null}
      </PaperCard>

      {/* Right: Live Page Preview */}
      <PaperCard flat style={{ padding: 'var(--sp-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-3)' }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="type-label" style={{ color: 'var(--ink-muted)' }}>
            NOTEBOOK PAGE PREVIEW
          </span>

          {totalPages > 1 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <Button
                variant="note"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="type-label">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="note"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          ) : null}
        </div>

        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            border: '1.5px solid var(--paper-edge)',
            borderRadius: 'var(--r-sm)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-paper)',
          }}
        >
          <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      </PaperCard>
    </div>
  );
}
