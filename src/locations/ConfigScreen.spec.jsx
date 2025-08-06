import React from 'react';
import ConfigScreen from './ConfigScreen';
import { render, waitFor } from '@testing-library/react';
import { mockCma, mockSdk } from '../../test/mocks';
import { vi } from 'vitest';

vi.mock('@contentful/react-apps-toolkit', () => ({
  useSDK: () => mockSdk,
  useCMA: () => mockCma,
}));

describe('Config Screen component', () => {
  it('renders the config screen', async () => {
    const { getByText } = render(<ConfigScreen />);

    await waitFor(() => {
      expect(getByText('Conditional Fields Configuration')).toBeInTheDocument();
    });
  });
});
