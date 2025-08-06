import React from 'react';
import EntryEditor from './EntryEditor';
import { render, waitFor } from '@testing-library/react';
import { mockCma, mockSdk } from '../../test/mocks';
import { vi } from 'vitest';

vi.mock('@contentful/react-apps-toolkit', () => ({
  useSDK: () => mockSdk,
  useCMA: () => mockCma,
  useAutoResizer: () => {},
}));

describe('Entry component', () => {
  it('renders the editor', async () => {
    const { container } = render(<EntryEditor />);
    await waitFor(() => {
      expect(container).toBeDefined();
    });
  });
});
