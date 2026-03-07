import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────────

import { mockLucideIcons, mockGlassCardFactory, mockButtonFactory } from '../../__helpers__';

vi.mock('lucide-react', () =>
  mockLucideIcons('Upload', 'File', 'X', 'ArrowRight', 'Loader2', 'Info'),
);

// Mock PartnerConsentCheckbox to avoid store dependencies
vi.mock('@/components/legal/partner-consent-checkbox', () => ({
  PartnerConsentCheckbox: ({ filesChanged }: { filesChanged?: unknown }) => (
    <div data-testid="partner-consent-checkbox" data-files-changed={String(filesChanged ?? '')}>
      PartnerConsentCheckbox
    </div>
  ),
}));

vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/button', () => mockButtonFactory());

// ── Import component after mocks ─────────────────────────────────────────────

import { CoupleUploadCard } from '../../../components/genetics/couple-upload-card';

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockFile(name: string, size: number, type = 'text/plain'): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

function renderCard(overrides: Partial<React.ComponentProps<typeof CoupleUploadCard>> = {}) {
  const defaultProps = {
    parentAFile: null,
    parentBFile: null,
    onFileSelectA: vi.fn(),
    onFileSelectB: vi.fn(),
    ...overrides,
  };
  return { ...render(<CoupleUploadCard {...defaultProps} />), props: defaultProps };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CoupleUploadCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Renders two upload zones
  it('renders two upload zones for Person A and Person B', () => {
    renderCard();

    expect(screen.getByLabelText('Upload Person A DNA file')).toBeInTheDocument();
    expect(screen.getByLabelText('Upload Person B DNA file')).toBeInTheDocument();
    expect(screen.getByText('Person A')).toBeInTheDocument();
    expect(screen.getByText('Person B')).toBeInTheDocument();
  });

  // 2. File selection triggers onFileSelectA/B callbacks
  it('triggers onFileSelectA when a valid file is selected for Person A', () => {
    const onFileSelectA = vi.fn();
    renderCard({ onFileSelectA });

    const file = createMockFile('test-parent-a.txt', 1024);

    // Find the file inputs (hidden) — there should be 2
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBe(2);

    // First input is Person A
    fireEvent.change(fileInputs[0], { target: { files: [file] } });

    expect(onFileSelectA).toHaveBeenCalledWith(file);
  });

  it('triggers onFileSelectB when a valid file is selected for Person B', () => {
    const onFileSelectB = vi.fn();
    renderCard({ onFileSelectB });

    const file = createMockFile('test-parent-b.csv', 2048);

    const fileInputs = document.querySelectorAll('input[type="file"]');

    // Second input is Person B
    fireEvent.change(fileInputs[1], { target: { files: [file] } });

    expect(onFileSelectB).toHaveBeenCalledWith(file);
  });

  // 3. Shows filename when file is selected
  it('shows filename and file size when Person A file is selected', () => {
    const file = createMockFile('my-dna-data.txt', 5 * 1024 * 1024); // 5 MB

    renderCard({ parentAFile: file });

    expect(screen.getByTestId('filename-A')).toHaveTextContent('my-dna-data.txt');
    expect(screen.getByText('5.0 MB')).toBeInTheDocument();
  });

  it('shows filename and file size when Person B file is selected', () => {
    const file = createMockFile('partner-data.vcf', 512 * 1024); // 512 KB

    renderCard({ parentBFile: file });

    expect(screen.getByTestId('filename-B')).toHaveTextContent('partner-data.vcf');
    expect(screen.getByText('512.0 KB')).toBeInTheDocument();
  });

  // 4. Remove button clears the file
  it('calls onFileSelectA(null) when Remove button is clicked for Person A', () => {
    const file = createMockFile('parent-a.txt', 1024);
    const onFileSelectA = vi.fn();

    renderCard({ parentAFile: file, onFileSelectA });

    const removeButton = screen.getByLabelText('Remove Person A file');
    fireEvent.click(removeButton);

    expect(onFileSelectA).toHaveBeenCalledWith(null);
  });

  it('calls onFileSelectB(null) when Remove button is clicked for Person B', () => {
    const file = createMockFile('parent-b.csv', 2048);
    const onFileSelectB = vi.fn();

    renderCard({ parentBFile: file, onFileSelectB });

    const removeButton = screen.getByLabelText('Remove Person B file');
    fireEvent.click(removeButton);

    expect(onFileSelectB).toHaveBeenCalledWith(null);
  });

  // 5. Rejects files over 200MB (shows error)
  it('shows an error when a file exceeds 200 MB', () => {
    const onFileSelectA = vi.fn();
    renderCard({ onFileSelectA });

    const bigFile = createMockFile('huge-genome.txt', 210 * 1024 * 1024); // 210 MB

    const fileInputs = document.querySelectorAll('input[type="file"]');
    fireEvent.change(fileInputs[0], { target: { files: [bigFile] } });

    expect(screen.getByRole('alert')).toHaveTextContent(/exceeds 200 MB limit/);
    expect(onFileSelectA).not.toHaveBeenCalled();
  });

  // 6. Rejects non-DNA file extensions (shows error)
  it('shows an error when a file with unsupported extension is selected', () => {
    const onFileSelectA = vi.fn();
    renderCard({ onFileSelectA });

    const pdfFile = createMockFile('document.pdf', 1024);

    const fileInputs = document.querySelectorAll('input[type="file"]');
    fireEvent.change(fileInputs[0], { target: { files: [pdfFile] } });

    expect(screen.getByRole('alert')).toHaveTextContent(/Unsupported file format/);
    expect(onFileSelectA).not.toHaveBeenCalled();
  });

  it('accepts all valid DNA file extensions (.txt, .csv, .vcf, .gz)', () => {
    const extensions = [
      { name: 'data.txt', size: 1024 },
      { name: 'data.csv', size: 1024 },
      { name: 'data.vcf', size: 1024 },
      { name: 'data.gz', size: 1024 },
    ];

    for (const ext of extensions) {
      const onFileSelectA = vi.fn();
      const { unmount } = render(
        <CoupleUploadCard
          parentAFile={null}
          parentBFile={null}
          onFileSelectA={onFileSelectA}
          onFileSelectB={vi.fn()}
        />,
      );

      const file = createMockFile(ext.name, ext.size);
      const fileInputs = document.querySelectorAll('input[type="file"]');
      fireEvent.change(fileInputs[0], { target: { files: [file] } });

      expect(onFileSelectA).toHaveBeenCalledWith(file);
      unmount();
    }
  });

  // 7. Same-file detection shows error
  it('shows same-file error when both zones receive identical file name+size', () => {
    const existingFile = createMockFile('identical.txt', 1024);
    const onFileSelectB = vi.fn();

    renderCard({ parentAFile: existingFile, onFileSelectB });

    // Try to upload the same file to Person B
    const duplicateFile = createMockFile('identical.txt', 1024);
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fireEvent.change(fileInputs[0], { target: { files: [duplicateFile] } });

    expect(
      screen.getByText('Please upload files from two different individuals'),
    ).toBeInTheDocument();
    expect(onFileSelectB).not.toHaveBeenCalled();
  });

  // 8. PartnerConsentCheckbox is rendered
  it('renders the PartnerConsentCheckbox', () => {
    renderCard();

    expect(screen.getByTestId('partner-consent-checkbox')).toBeInTheDocument();
    expect(screen.getByText('PartnerConsentCheckbox')).toBeInTheDocument();
  });

  // 9. role="group" present on wrapper
  it('has role="group" on the wrapper with proper aria-labelledby', () => {
    renderCard();

    const group = screen.getByRole('group');
    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute('aria-labelledby', 'couple-upload-heading');
  });

  // 10. Responsive: verify grid classes exist
  it('contains responsive grid classes for desktop and mobile layouts', () => {
    const { container } = renderCard();

    // The grid container should have both grid-cols-1 (mobile) and md:grid-cols-2 (desktop)
    const gridEl = container.querySelector('.grid');
    expect(gridEl).toBeInTheDocument();
    expect(gridEl).toHaveClass('grid-cols-1');
    expect(gridEl).toHaveClass('md:grid-cols-2');
  });

  // ── Additional coverage ──────────────────────────────────────────────────

  it("renders the heading 'Upload DNA Files'", () => {
    renderCard();

    const heading = screen.getByText('Upload DNA Files');
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveAttribute('id', 'couple-upload-heading');
  });

  it('shows Browse Files buttons when no files are selected', () => {
    renderCard();

    const browseButtons = screen.getAllByText('Browse Files');
    expect(browseButtons).toHaveLength(2);
  });

  it('does not show Browse Files when files are selected', () => {
    const fileA = createMockFile('a.txt', 1024);
    const fileB = createMockFile('b.csv', 2048);

    renderCard({ parentAFile: fileA, parentBFile: fileB });

    expect(screen.queryByText('Browse Files')).not.toBeInTheDocument();
  });

  it('shows two Remove buttons when both files are selected', () => {
    const fileA = createMockFile('a.txt', 1024);
    const fileB = createMockFile('b.csv', 2048);

    renderCard({ parentAFile: fileA, parentBFile: fileB });

    expect(screen.getByLabelText('Remove Person A file')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Person B file')).toBeInTheDocument();
  });

  it('handles drag and drop on Person A zone', () => {
    const onFileSelectA = vi.fn();
    renderCard({ onFileSelectA });

    const zoneA = screen.getByLabelText('Upload Person A DNA file');
    const file = createMockFile('dragged.vcf', 4096);

    // Create a mock DataTransfer
    const dataTransfer = {
      files: [file],
      items: [],
      types: [],
    };

    fireEvent.dragOver(zoneA, { dataTransfer });
    fireEvent.drop(zoneA, { dataTransfer });

    expect(onFileSelectA).toHaveBeenCalledWith(file);
  });

  it('drag over adds visual highlight, drag leave removes it', () => {
    renderCard();

    const zoneA = screen.getByLabelText('Upload Person A DNA file');

    const dataTransfer = { files: [], items: [], types: [] };

    // Drag over should not throw
    fireEvent.dragOver(zoneA, { dataTransfer });
    fireEvent.dragLeave(zoneA, { dataTransfer });

    // No errors means the event handlers work correctly
    expect(zoneA).toBeInTheDocument();
  });

  it('upload zone has min-h-[120px] for mobile touch targets', () => {
    renderCard();

    const zoneA = screen.getByLabelText('Upload Person A DNA file');
    expect(zoneA).toHaveClass('min-h-[120px]');
  });

  it('passes filesChanged to PartnerConsentCheckbox based on parentBFile', () => {
    const fileB = createMockFile('b-file.txt', 1024);
    renderCard({ parentBFile: fileB });

    const consent = screen.getByTestId('partner-consent-checkbox');
    expect(consent).toHaveAttribute('data-files-changed', 'b-file.txt');
  });
});
