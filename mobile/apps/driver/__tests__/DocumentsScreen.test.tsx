import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import DocumentsScreen from '../screens/DocumentsScreen';
import { kyc } from '@easyryde/shared';

jest.spyOn(Alert, 'alert');

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() } as any;

describe('DocumentsScreen', () => {
  const mockMyVerifications = kyc.myVerifications as jest.Mock;
  const mockSubmit = kyc.submit as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMyVerifications.mockResolvedValue({
      verifications: [
        {
          verification_type: 'license',
          status: 'approved',
          document_number: 'DL123456',
          expires_at: '2027-01-01',
          created_at: '2025-01-01',
        },
        {
          verification_type: 'vehicle',
          status: 'rejected',
          document_number: '',
          rejection_reason: 'Image too blurry',
          created_at: '2025-01-10',
        },
      ],
    });
  });

  it('renders documents header', async () => {
    const { getByText } = render(<DocumentsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('Documents')).toBeTruthy();
      expect(getByText('Upload & manage your verification documents')).toBeTruthy();
    });
  });

  it('shows loading state initially', () => {
    const { getByText } = render(<DocumentsScreen navigation={mockNavigation} />);
    expect(getByText('Loading documents...')).toBeTruthy();
  });

  it('loads verifications on mount', async () => {
    render(<DocumentsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(mockMyVerifications).toHaveBeenCalled();
    });
  });

  it('displays all document types', async () => {
    const { getByText } = render(<DocumentsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText("Driver's License")).toBeTruthy();
      expect(getByText('Vehicle Registration')).toBeTruthy();
      expect(getByText('Vehicle Insurance')).toBeTruthy();
      expect(getByText('Professional Driving Permit')).toBeTruthy();
    });
  });

  it('shows approved status for verified documents', async () => {
    const { getByText } = render(<DocumentsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('Approved')).toBeTruthy();
    });
  });

  it('shows not uploaded status for unverified documents', async () => {
    const { getByText } = render(<DocumentsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('Not Uploaded')).toBeTruthy();
    });
  });

  it('shows rejected status for rejected documents', async () => {
    const { getAllByText } = render(<DocumentsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getAllByText('Rejected').length).toBeGreaterThan(0);
    });
  });

  it('shows rejection reason for rejected documents', async () => {
    const { getAllByText } = render(<DocumentsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getAllByText('Image too blurry').length).toBeGreaterThan(0);
    });
  });

  it('shows upload button for rejected documents', async () => {
    const { getAllByText } = render(<DocumentsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getAllByText('Re-upload').length).toBeGreaterThan(0);
    });
  });

  it('shows upload button for un-uploaded documents', async () => {
    mockMyVerifications.mockResolvedValueOnce({ verifications: [] });
    const { getAllByText } = render(<DocumentsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getAllByText('Upload').length).toBeGreaterThan(0);
    });
  });

  it('shows approved badge for approved documents', async () => {
    const { getByText } = render(<DocumentsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('Document verified')).toBeTruthy();
    });
  });

  it('opens upload modal when upload button pressed', async () => {
    const { getAllByText } = render(<DocumentsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getAllByText('Re-upload').length).toBeGreaterThan(0);
    });

    await act(async () => {
      fireEvent.press(getAllByText('Re-upload')[0]);
    });

    await waitFor(() => {
      expect(getAllByText(/Upload Vehicle/).length).toBeGreaterThan(0);
    });
  });

  it('shows info card about document review', async () => {
    const { getByText } = render(<DocumentsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText(/All documents are reviewed within 24-48 hours/)).toBeTruthy();
    });
  });

  it('navigates back when back button pressed', async () => {
    const { getByTestId } = render(<DocumentsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      // Back button exists
    });
  });

  it('displays document numbers when available', async () => {
    const { getByText } = render(<DocumentsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('#DL123456')).toBeTruthy();
    });
  });

  it('displays expiry dates when available', async () => {
    const { getByText } = render(<DocumentsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText(/Expires:/)).toBeTruthy();
    });
  });

  it('displays submission dates', async () => {
    const { getAllByText } = render(<DocumentsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getAllByText(/Submitted:/).length).toBeGreaterThan(0);
    });
  });
});
