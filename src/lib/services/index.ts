/**
 * Business Logic Services
 *
 * This folder contains all business logic and orchestration.
 * Each domain should have its own service file following the pattern: <domain>.service.ts
 *
 * Conventions:
 * - Services orchestrate business logic (validation, repo calls, side effects)
 * - Services can call multiple repositories
 * - Services handle side effects like sending emails, notifications
 * - API Routes should call services, not repositories directly
 */

export { AuthService } from './auth.service';
export { DashboardService } from './dashboard.service';

