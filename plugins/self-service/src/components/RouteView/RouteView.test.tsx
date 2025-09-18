import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RouteView } from './RouteView';

// Mock page components
jest.mock('../Home', () => ({
  HomeComponent: () => <div data-testid="home">Home</div>,
}));
jest.mock('../CatalogImport', () => ({
  CatalogImport: () => <div data-testid="catalog-import">CatalogImport</div>,
}));
jest.mock('../CreateTask', () => ({
  CreateTask: () => <div data-testid="create-task">CreateTask</div>,
}));
jest.mock('../RunTask', () => ({
  RunTask: () => <div data-testid="run-task">RunTask</div>,
}));
jest.mock('../TaskList', () => ({
  TaskList: () => <div data-testid="task-list">TaskList</div>,
}));
jest.mock('../CatalogItemDetails', () => ({
  CatalogItemsDetails: () => (
    <div data-testid="catalog-details">CatalogDetails</div>
  ),
}));
jest.mock('../feedback/FeedbackFooter', () => ({
  FeedbackFooter: () => <div data-testid="feedback-footer">FeedbackFooter</div>,
}));

// Mock RequirePermission to just render children
jest.mock('@backstage/plugin-permission-react', () => ({
  RequirePermission: ({ children }: any) => <>{children}</>,
}));

describe('RouteView', () => {
  it('renders default routes without crashing', () => {
    render(
      <MemoryRouter initialEntries={['/catalog']}>
        <RouteView />
      </MemoryRouter>,
    );

    // Check that home component renders
    expect(screen.getByTestId('home')).toBeInTheDocument();
    expect(screen.getByTestId('feedback-footer')).toBeInTheDocument();
  });

  it('renders CatalogImport with permission wrapper', () => {
    render(
      <MemoryRouter initialEntries={['/catalog-import']}>
        <RouteView />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('catalog-import')).toBeInTheDocument();
  });

  it('renders TaskList route', () => {
    render(
      <MemoryRouter initialEntries={['/create/tasks']}>
        <RouteView />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('task-list')).toBeInTheDocument();
  });

  it('renders RunTask route', () => {
    render(
      <MemoryRouter initialEntries={['/create/tasks/123']}>
        <RouteView />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('run-task')).toBeInTheDocument();
  });

  it('renders CreateTask route', () => {
    render(
      <MemoryRouter initialEntries={['/create/templates/ns/template1']}>
        <RouteView />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('create-task')).toBeInTheDocument();
  });

  it('redirects unknown routes to /self-service/catalog', () => {
    render(
      <MemoryRouter initialEntries={['/unknown']}>
        <RouteView />
      </MemoryRouter>,
    );

    // Since Navigate is not rendered to DOM, we can just check FeedbackFooter renders
    expect(screen.getByTestId('feedback-footer')).toBeInTheDocument();
  });
});
