import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { moduleAccessGuard } from './core/guards/module-access.guard';
import { guestGuard } from './core/guards/guest.guard';
import { LoginComponent } from './features/auth/login.component';
import { AdminPanelComponent } from './features/admin/admin-panel.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { LandingComponent } from './features/landing/landing.component';
import { LayoutComponent } from './features/layout/layout.component';
import { NotFoundComponent } from './features/not-found/not-found.component';
import { PasswordRecoveryComponent } from './features/auth/password-recovery.component';
import { ProfileComponent } from './features/profile/profile.component';
import { EmpresaFormComponent } from './features/empresas/empresa-form.component';
import { EmpresaListComponent } from './features/empresas/empresa-list.component';
import { RoleFormComponent } from './features/roles/role-form.component';
import { RoleListComponent } from './features/roles/role-list.component';
import { RoleMenuPermissionsComponent } from './features/roles/role-menu-permissions.component';
import { TestFormComponent } from './features/test/test-form.component';
import { ParticipantListComponent } from './features/trainings/participant-list.component';
import { TrainingAssignComponent } from './features/trainings/training-assign.component';
import { TrainingFormComponent } from './features/trainings/training-form.component';
import { TrainingListComponent } from './features/trainings/training-list.component';
import { TrainingQuestionsComponent } from './features/trainings/training-questions.component';
import { TrainingResultsComponent } from './features/trainings/training-results.component';
import { PublicDashboardComponent } from './features/public-trainings/public-dashboard.component';
import { PublicExamComponent } from './features/public-trainings/public-exam.component';
import { PublicLoginComponent } from './features/public-trainings/public-login.component';
import { PublicResultComponent } from './features/public-trainings/public-result.component';
import { VideoIndexActionComponent } from './features/video-indexaction/video-indexaction.component';
import { UserFormComponent } from './features/users/user-form.component';
import { UserListComponent } from './features/users/user-list.component';
import { UserMenuPermissionsComponent } from './features/users/user-menu-permissions.component';

export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [guestGuard],
    component: LandingComponent
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    component: LoginComponent
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    component: PasswordRecoveryComponent
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [moduleAccessGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent, data: { pageTitle: 'Dashboard' } },
      { path: 'admin', component: AdminPanelComponent, data: { pageTitle: 'Administracion' } },
      { path: 'profile', component: ProfileComponent, data: { pageTitle: 'Perfil' } },
      { path: 'roles', component: RoleListComponent, data: { pageTitle: 'Roles' } },
      { path: 'roles/create', component: RoleFormComponent, data: { pageTitle: 'Roles' } },
      { path: 'roles/:id/edit', component: RoleFormComponent, data: { pageTitle: 'Roles' } },
      { path: 'roles/:id/menu-permissions', component: RoleMenuPermissionsComponent, data: { pageTitle: 'Roles' } },
      { path: 'empresas', component: EmpresaListComponent, data: { pageTitle: 'Empresas' } },
      { path: 'empresas/create', component: EmpresaFormComponent, data: { pageTitle: 'Empresas' } },
      { path: 'empresas/:id/edit', component: EmpresaFormComponent, data: { pageTitle: 'Empresas' } },
      { path: 'test', component: TestFormComponent, data: { pageTitle: 'Prueba' } },
      { path: 'users', component: UserListComponent, data: { pageTitle: 'Usuarios' } },
      { path: 'users/create', component: UserFormComponent, data: { pageTitle: 'Usuarios' } },
      { path: 'users/create/:empresaId', component: UserFormComponent, data: { pageTitle: 'Usuarios' } },
      { path: 'users/:empresaId', component: UserListComponent, data: { pageTitle: 'Usuarios' } },
      { path: 'users/:id/edit', component: UserFormComponent, data: { pageTitle: 'Usuarios' } },
      { path: 'users/:id/menu-permissions', component: UserMenuPermissionsComponent, data: { pageTitle: 'Usuarios' } },
      { path: 'video_indexaction', component: VideoIndexActionComponent, data: { pageTitle: 'Video Index Action' } },
      { path: 'video-indexaction', redirectTo: 'video_indexaction', pathMatch: 'full' },
      {
        path: 'trainings',
        component: TrainingListComponent,
        data: { pageTitle: 'Capacitaciones' },
        children: [
          { path: 'create', component: TrainingFormComponent, data: { pageTitle: 'Capacitaciones' } },
          { path: 'participants', component: ParticipantListComponent, data: { pageTitle: 'Capacitaciones' } },
          { path: ':id/edit', component: TrainingFormComponent, data: { pageTitle: 'Capacitaciones' } },
          { path: ':id/questions', component: TrainingQuestionsComponent, data: { pageTitle: 'Capacitaciones' } },
          { path: ':id/assign', component: TrainingAssignComponent, data: { pageTitle: 'Capacitaciones' } },
          { path: ':id/results', component: TrainingResultsComponent, data: { pageTitle: 'Capacitaciones' } }
        ]
      },
    ]
  },
  // Public training routes (no auth guard, uses document_number)
  {
    path: 'public/trainings',
    component: PublicLoginComponent
  },
  {
    path: 'public/trainings/dashboard',
    component: PublicDashboardComponent
  },
  {
    path: 'public/trainings/:id/take',
    component: PublicExamComponent
  },
  {
    path: 'public/trainings/:id/result',
    component: PublicResultComponent
  },
  {
    path: '**',
    component: NotFoundComponent
  }
];
