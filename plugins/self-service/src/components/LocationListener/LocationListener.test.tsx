import { render } from '@testing-library/react';
import { LocationListener } from './LocationListener';
import { useLocation } from 'react-router-dom';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: jest.fn(),
}));

describe('LocationListener', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('redirects / and /create to /self-service/catalog', () => {
    const locations = ['/', '/create'];
    locations.forEach(path => {
      (useLocation as jest.Mock).mockReturnValue({ pathname: path });
      render(<LocationListener />);
      expect(mockNavigate).toHaveBeenCalledWith('/self-service/catalog');
      mockNavigate.mockClear();
    });
  });

  it('redirects /create/tasks and /create/tasks/:taskId correctly', () => {
    (useLocation as jest.Mock).mockReturnValue({ pathname: '/create/tasks' });
    render(<LocationListener />);
    expect(mockNavigate).toHaveBeenCalledWith('/self-service/create/tasks');

    mockNavigate.mockClear();

    (useLocation as jest.Mock).mockReturnValue({
      pathname: '/create/tasks/:taskId',
    });
    render(<LocationListener />);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/self-service/create/tasks/:taskId',
    );
  });

  it('redirects /catalog-import correctly', () => {
    (useLocation as jest.Mock).mockReturnValue({ pathname: '/catalog-import' });
    render(<LocationListener />);
    expect(mockNavigate).toHaveBeenCalledWith('/self-service/catalog-import');
  });

  it('hides links for /self-service/catalog-import', () => {
    jest.useFakeTimers();

    // Mock document.evaluate to return fake elements
    const element1 = document.createElement('div');
    const element2 = document.createElement('div');
    const evaluateMock = jest
      .spyOn(document, 'evaluate')
      .mockImplementation(xpath => {
        return {
          singleNodeValue: xpath.toString().includes('a[1]')
            ? element1
            : element2,
        } as any;
      });

    (useLocation as jest.Mock).mockReturnValue({
      pathname: '/self-service/catalog-import',
    });
    render(<LocationListener />);

    jest.advanceTimersByTime(500);

    expect(element1.style.display).toBe('none');
    expect(element2.style.display).toBe('none');

    jest.useRealTimers();
    evaluateMock.mockRestore();
  });

  it('redirects /catalog/default/template/:templateName correctly', () => {
    const templateName = 'my-template';
    (useLocation as jest.Mock).mockReturnValue({
      pathname: `/catalog/default/template/${templateName}`,
    });
    render(<LocationListener />);
    expect(mockNavigate).toHaveBeenCalledWith(
      `/self-service/catalog/default/${templateName}`,
    );
  });
});
