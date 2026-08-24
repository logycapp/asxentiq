import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Tooltip } from 'bootstrap';
import { finalize } from 'rxjs';

import { LoadingService } from '../../core/services/loading.service';
import { Empresa, EmpresaService } from '../../core/services/empresa.service';
import { PowerbiProject, PowerbiService } from '../../core/services/powerbi.service';
import { SwalAlertComponent } from '../../core/components/swal-alert.component';
import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

@Component({
  selector: 'app-powerbi-project-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent, ModalShellComponent, SwalAlertComponent],
  templateUrl: './powerbi-project-list.component.html',
  styleUrls: [],
  styles: [`
    :host {
      display: block;
    }

    :host .powerbi-status-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 5.5rem;
      padding: 0.45rem 0.85rem;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    :host .powerbi-status-published {
      background: rgba(34, 197, 94, 0.14);
      border-color: rgba(34, 197, 94, 0.32);
      color: #15803d;
    }

    :host .powerbi-status-draft {
      background: rgba(245, 158, 11, 0.14);
      border-color: rgba(245, 158, 11, 0.32);
      color: #b45309;
    }

    :host .powerbi-project-name {
      color: #132238;
      font-weight: 700;
    }

    :host .powerbi-project-description {
      color: #64748b;
      font-size: 0.85rem;
      max-width: 34rem;
    }
  `]
})
export class PowerbiProjectListComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly powerbiService = inject(PowerbiService);
  private readonly empresaService = inject(EmpresaService);
  private readonly loadingService = inject(LoadingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private tooltipInstances = new Map<HTMLElement, Tooltip>();
  private tooltipRefreshTimer: ReturnType<typeof window.setTimeout> | null = null;

  projects: PowerbiProject[] = [];
  empresas: Empresa[] = [];
  transformers: string[] = [];
  loading = false;
  message = '';
  errorMessage = '';
  modalMode: 'create' | 'edit' | null = null;
  modalLoading = false;
  modalSaving = false;
  modalErrorMessage = '';
  editingProjectId: number | null = null;

  readonly projectForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(2000)]],
    empresa_id: ['' as string | number, []],
    handler: ['']
  });

  ngOnInit(): void {
    this.loadInitialData();
    this.syncModalWithRoute();
  }

  ngAfterViewInit(): void {
    this.refreshTooltips();
  }

  ngOnDestroy(): void {
    if (this.tooltipRefreshTimer !== null) {
      window.clearTimeout(this.tooltipRefreshTimer);
      this.tooltipRefreshTimer = null;
    }

    this.tooltipInstances.forEach((tooltip) => tooltip.dispose());
    this.tooltipInstances.clear();
  }

  loadInitialData(): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService.track(
      this.empresaService.list()
    ).subscribe({
      next: (empresas) => {
        this.empresas = empresas;
        this.loadTransformers();
      },
      error: () => (this.errorMessage = 'No fue posible cargar las empresas.')
    });
  }

  private loadTransformers(): void {
    this.loadingService.track(this.powerbiService.listTransformers()).subscribe({
      next: (response) => {
        this.transformers = response.transformers;
        this.loadProjects();
      },
      error: () => (this.errorMessage = 'No fue posible cargar los transformadores.')
    });
  }

  loadProjects(): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService.track(this.powerbiService.listProjects())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (projects) => {
          this.projects = projects;
          this.openPendingModalIfNeeded();
          this.scheduleTooltipRefresh();
        },
        error: () => (this.errorMessage = 'No fue posible cargar los proyectos.')
      });
  }

  openCreateModal(): void {
    this.modalMode = 'create';
    this.editingProjectId = null;
    this.modalErrorMessage = '';
    this.modalSaving = false;
    this.modalLoading = false;
    this.projectForm.reset({
      name: '',
      description: '',
      empresa_id: '',
      handler: ''
    });
  }

  openEditModal(project: PowerbiProject): void {
    this.modalMode = 'edit';
    this.editingProjectId = project.id;
    this.modalErrorMessage = '';
    this.modalSaving = false;
    this.modalLoading = false;
    this.projectForm.reset({
      name: project.name,
      description: project.description ?? '',
      empresa_id: project.empresa_id ? String(project.empresa_id) : '',
      handler: project.handler ?? ''
    });
  }

  closeModal(navigateBack = true): void {
    if (this.modalSaving) {
      return;
    }

    this.modalMode = null;
    this.editingProjectId = null;
    this.modalErrorMessage = '';
    this.modalLoading = false;
    this.modalSaving = false;
    this.projectForm.reset({ name: '', description: '', empresa_id: '', handler: '' });

    if (navigateBack && this.isRouteDrivenModal()) {
      void this.router.navigate(['/powerbi']);
    }
  }

  saveModal(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    if (this.modalMode === 'edit' && !this.editingProjectId) {
      this.modalErrorMessage = 'No fue posible determinar el proyecto a editar.';
      return;
    }

    const payload = this.buildPayload();
    const request = this.modalMode === 'edit'
      ? this.powerbiService.updateProject(this.editingProjectId as number, payload)
      : this.powerbiService.createProject(payload);

    this.modalSaving = true;
    this.modalErrorMessage = '';

    this.loadingService.track(request)
      .pipe(finalize(() => (this.modalSaving = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message;
          const shouldNavigateBack = this.isRouteDrivenModal();
          this.closeModal(false);

          if (shouldNavigateBack) {
            void this.router.navigate(['/powerbi']).then(() => this.loadProjects());
            return;
          }

          this.loadProjects();
        },
        error: (error) => {
          this.modalErrorMessage = error?.error?.message || this.extractValidationError(error?.error?.errors) || 'No fue posible guardar el proyecto.';
        }
      });
  }

  deleteProject(project: PowerbiProject): void {
    const confirmed = window.confirm(`¿Deseas eliminar el proyecto "${project.name}"? Se eliminarán sus datasets y visualizaciones.`);

    if (!confirmed) {
      return;
    }

    this.loadingService.track(this.powerbiService.deleteProject(project.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.loadProjects();
      },
      error: () => (this.errorMessage = 'No fue posible eliminar el proyecto.')
    });
  }

  publishProject(project: PowerbiProject): void {
    this.loadingService.track(this.powerbiService.publishProject(project.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.loadProjects();
      },
      error: () => (this.errorMessage = 'No fue posible publicar el proyecto.')
    });
  }

  unpublishProject(project: PowerbiProject): void {
    this.loadingService.track(this.powerbiService.unpublishProject(project.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.loadProjects();
      },
      error: () => (this.errorMessage = 'No fue posible despublicar el proyecto.')
    });
  }

  publicUrl(project: PowerbiProject): string {
    return `${window.location.origin}/public/powerbi/${project.public_token}`;
  }

  trackById(_: number, project: PowerbiProject): number {
    return project.id;
  }

  get isEditMode(): boolean {
    return this.modalMode === 'edit';
  }

  get modalTitle(): string {
    return this.isEditMode ? 'Editar proyecto' : 'Crear proyecto';
  }

  get modalSubtitle(): string {
    return this.isEditMode
      ? 'Actualiza los datos del proyecto seleccionado.'
      : 'Registra un nuevo proyecto de visualización.';
  }

  handlerLabel(project: PowerbiProject): string {
    return this.handlerDisplayLabel(project.handler);
  }

  handlerDisplayLabel(handler: string | null): string {
    return handler ? handler.replace(/_/g, ' ') : 'Ninguno';
  }

  updatedAtLabel(project: PowerbiProject): string {
    return project.updated_at ? new Date(project.updated_at).toLocaleDateString('es-CO') : '—';
  }

  private buildPayload(): {
    name: string;
    description: string;
    empresa_id: number | null;
    handler: string;
  } {
    const raw = this.projectForm.getRawValue();

    return {
      name: raw.name?.trim() ?? '',
      description: raw.description?.trim() ?? '',
      empresa_id: raw.empresa_id ? Number(raw.empresa_id) : null,
      handler: raw.handler ?? ''
    };
  }

  private refreshTooltips(): void {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-bs-toggle="tooltip"]'));
    const activeElements = new Set(elements);

    this.tooltipInstances.forEach((tooltip, element) => {
      if (!activeElements.has(element)) {
        tooltip.dispose();
        this.tooltipInstances.delete(element);
      }
    });

    elements.forEach((element) => {
      if (this.tooltipInstances.has(element)) {
        return;
      }

      this.tooltipInstances.set(element, new Tooltip(element));
    });
  }

  private scheduleTooltipRefresh(): void {
    if (this.tooltipRefreshTimer !== null) {
      window.clearTimeout(this.tooltipRefreshTimer);
    }

    this.tooltipRefreshTimer = window.setTimeout(() => {
      this.tooltipRefreshTimer = null;
      this.refreshTooltips();
    });
  }

  private syncModalWithRoute(): void {
    const currentUrl = this.router.url.split('?')[0].replace(/\/$/, '');

    if (currentUrl.endsWith('/powerbi/create')) {
      this.openCreateModal();
      return;
    }

    if (currentUrl.includes('/powerbi/') && currentUrl.endsWith('/edit')) {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      if (Number.isFinite(id) && id > 0) {
        this.openPendingEditModal(id);
      }
    }
  }

  private openPendingModalIfNeeded(): void {
    const currentUrl = this.router.url.split('?')[0].replace(/\/$/, '');

    if (currentUrl.endsWith('/powerbi/create') && this.modalMode !== 'create') {
      this.openCreateModal();
      return;
    }

    if (currentUrl.includes('/powerbi/') && currentUrl.endsWith('/edit') && this.modalMode !== 'edit') {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      if (Number.isFinite(id) && id > 0) {
        this.openPendingEditModal(id);
      }
    }
  }

  private openPendingEditModal(id: number): void {
    this.modalMode = 'edit';
    this.editingProjectId = id;
    this.modalErrorMessage = '';
    this.modalSaving = false;
    this.modalLoading = true;

    const project = this.projects.find((item) => item.id === id);

    if (project) {
      this.openEditModal(project);
      return;
    }

    this.loadingService.track(this.powerbiService.getProject(id)).subscribe({
      next: (item) => {
        this.modalLoading = false;
        this.openEditModal(item);
      },
      error: () => {
        this.modalLoading = false;
        this.modalMode = null;
        this.editingProjectId = null;
        this.errorMessage = 'No fue posible cargar el proyecto para editar.';

        if (this.isRouteDrivenModal()) {
          void this.router.navigate(['/powerbi']);
        }
      }
    });
  }

  private extractValidationError(errors?: Record<string, string[]>): string {
    if (!errors) {
      return '';
    }

    const firstKey = Object.keys(errors)[0];
    return firstKey ? errors[firstKey][0] : '';
  }

  private isRouteDrivenModal(): boolean {
    const currentUrl = this.router.url.split('?')[0].replace(/\/$/, '');
    return currentUrl.endsWith('/powerbi/create') || (currentUrl.includes('/powerbi/') && currentUrl.endsWith('/edit'));
  }
}
