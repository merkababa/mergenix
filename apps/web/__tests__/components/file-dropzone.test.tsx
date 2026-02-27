import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => {
      // Strip framer-motion-only props so they don't reach the DOM
      const {
        initial, animate, exit, transition, variants,
        whileHover, whileTap, layoutId, ...htmlProps
      } = props;
      return <div {...htmlProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  Shield: (props: any) => <svg data-testid="icon-shield" {...props} />,
  FileCheck: (props: any) => <svg data-testid="icon-file-check" {...props} />,
  AlertCircle: (props: any) => <svg data-testid="icon-alert-circle" {...props} />,
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import { FileDropzone } from '../../components/genetics/file-dropzone';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(name: string, type = 'text/plain'): File {
  return new File(['content'], name, { type });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FileDropzone', () => {
  const onFileSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the label text', () => {
    render(<FileDropzone label="Parent A (Mother)" onFileSelect={onFileSelect} />);

    expect(screen.getByText('Parent A (Mother)')).toBeInTheDocument();
  });

  it('renders "Drop your genetic file here" prompt when no file selected', () => {
    render(<FileDropzone label="Test Label" onFileSelect={onFileSelect} />);

    expect(screen.getByText('Drop your genetic file here')).toBeInTheDocument();
    expect(screen.getByText(/click to browse/i)).toBeInTheDocument();
  });

  it('renders privacy badge with "Files never leave your device"', () => {
    render(<FileDropzone label="Test Label" onFileSelect={onFileSelect} />);

    expect(screen.getByText('Files never leave your device')).toBeInTheDocument();
  });

  it('renders supported format names: 23andMe, AncestryDNA, MyHeritage, VCF', () => {
    render(<FileDropzone label="Test Label" onFileSelect={onFileSelect} />);

    expect(screen.getByText('23andMe')).toBeInTheDocument();
    expect(screen.getByText('AncestryDNA')).toBeInTheDocument();
    expect(screen.getByText('MyHeritage')).toBeInTheDocument();
    expect(screen.getByText('VCF')).toBeInTheDocument();
  });

  it('shows selected file name and format when selectedFile prop is provided', () => {
    render(
      <FileDropzone
        label="Test Label"
        onFileSelect={onFileSelect}
        selectedFile={{ name: 'genome.vcf', format: 'vcf' }}
      />,
    );

    expect(screen.getByText('genome.vcf')).toBeInTheDocument();
    expect(screen.getByText(/Detected: vcf/)).toBeInTheDocument();
  });

  it('detects VCF format from .vcf extension and calls onFileSelect with "vcf"', () => {
    render(<FileDropzone label="Test Label" onFileSelect={onFileSelect} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile('sample.vcf');

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledTimes(1);
    expect(onFileSelect).toHaveBeenCalledWith(file, 'vcf');
  });

  it('detects AncestryDNA format when filename includes "ancestry"', () => {
    render(<FileDropzone label="Test Label" onFileSelect={onFileSelect} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile('ancestry_raw_data.txt');

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(file, 'ancestrydna');
  });

  it('detects MyHeritage format from .csv extension', () => {
    render(<FileDropzone label="Test Label" onFileSelect={onFileSelect} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile('myheritage_raw_data.csv');

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(file, 'myheritage');
  });

  it('detects 23andMe format from .txt extension (non-ancestry)', () => {
    render(<FileDropzone label="Test Label" onFileSelect={onFileSelect} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile('genome_raw_data.txt');

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(file, '23andme');
  });

  it('shows error message for unsupported file format', () => {
    render(<FileDropzone label="Test Label" onFileSelect={onFileSelect} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile('photo.jpg', 'image/jpeg');

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        /Unsupported file format. Please upload a 23andMe, AncestryDNA, MyHeritage, or VCF file./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('is keyboard accessible — has role="button" and tabIndex={0}', () => {
    render(<FileDropzone label="Test Label" onFileSelect={onFileSelect} />);

    const dropzone = screen.getByRole('button', {
      name: /Test Label.*Drop genetic file or click to browse/i,
    });
    expect(dropzone).toBeInTheDocument();
    expect(dropzone).toHaveAttribute('tabindex', '0');
  });

  it('triggers file input click when Enter is pressed on the dropzone', () => {
    render(<FileDropzone label="Test Label" onFileSelect={onFileSelect} />);

    const dropzone = screen.getByRole('button', {
      name: /Test Label.*Drop genetic file or click to browse/i,
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});

    fireEvent.keyDown(dropzone, { key: 'Enter', code: 'Enter' });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('triggers file input click when Space is pressed on the dropzone', () => {
    render(<FileDropzone label="Test Label" onFileSelect={onFileSelect} />);

    const dropzone = screen.getByRole('button', {
      name: /Test Label.*Drop genetic file or click to browse/i,
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});

    fireEvent.keyDown(dropzone, { key: ' ', code: 'Space' });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
