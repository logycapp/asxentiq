import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ModalShellComponent } from '../../core/components/modal-shell.component';
import { LoadingService } from '../../core/services/loading.service';
import { TrainingService, TrainingParticipant } from '../../core/services/training.service';
import { PageHeaderComponent } from '../admin/layout/page-header/page-header.component';

@Component({
  selector: 'app-participant-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, ModalShellComponent],
  templateUrl: './participant-list.component.html',
  styleUrls: ['./participant-list.component.css']
})
export class ParticipantListComponent implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly loadingService = inject(LoadingService);

  participants: TrainingParticipant[] = [];
  filteredParticipants: TrainingParticipant[] = [];
  loading = false;
  message = '';
  errorMessage = '';
  searchQuery = '';
  sortKey = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Pagination
  page = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];

  // Modal state
  editingParticipant: TrainingParticipant | null = null;
  editDocumentNumber = '';
  editFullName = '';
  editEmail = '';
  editPhone = '';
  saving = false;
  creating = false;
  createDocumentNumber = '';
  createFullName = '';
  createEmail = '';
  createPhone = '';
  savingCreate = false;

  // Excel import/export
  exporting = false;
  importing = false;

  ngOnInit(): void {
    this.loadParticipants();
  }

  get totalParticipants(): number {
    return this.participants.length;
  }

  get filteredCount(): number {
    return this.filteredParticipants.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredParticipants.length / this.pageSize));
  }

  get paginatedParticipants(): TrainingParticipant[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredParticipants.slice(start, start + this.pageSize);
  }

  get startRecord(): number {
    return this.filteredParticipants.length === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.page * this.pageSize, this.filteredParticipants.length);
  }

  loadParticipants(): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService.track(this.trainingService.getAllParticipants())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          this.participants = data;
          this.applyFilter();
        },
        error: () => (this.errorMessage = 'Error al cargar participantes.')
      });
  }

  openCreateModal(): void {
    this.creating = true;
    this.createDocumentNumber = '';
    this.createFullName = '';
    this.createEmail = '';
    this.createPhone = '';
    this.errorMessage = '';
    this.savingCreate = false;
  }

  closeCreateModal(): void {
    this.creating = false;
  }

  saveCreateModal(): void {
    if (!this.createDocumentNumber || !this.createFullName) {
      this.errorMessage = 'Cedula y nombre son obligatorios.';
      return;
    }

    const payload: Partial<TrainingParticipant> = {
      document_number: this.createDocumentNumber,
      full_name: this.createFullName,
      email: this.createEmail || undefined,
      phone: this.createPhone || undefined,
    };

    this.savingCreate = true;
    this.errorMessage = '';

    this.loadingService
      .track(this.trainingService.createParticipant(payload))
      .pipe(finalize(() => (this.savingCreate = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message || 'Participante creado correctamente.';
          this.closeCreateModal();
          this.loadParticipants();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Error al crear participante.';
        }
      });
  }

  openEditModal(participant: TrainingParticipant): void {
    this.editingParticipant = participant;
    this.editDocumentNumber = participant.document_number;
    this.editFullName = participant.full_name;
    this.editEmail = participant.email || '';
    this.editPhone = participant.phone || '';
    this.errorMessage = '';
    this.saving = false;
  }

  closeEditModal(): void {
    this.editingParticipant = null;
  }

  saveEditModal(): void {
    if (!this.editingParticipant || !this.editDocumentNumber || !this.editFullName) {
      this.errorMessage = 'Cedula y nombre son obligatorios.';
      return;
    }

    const payload: Partial<TrainingParticipant> = {
      document_number: this.editDocumentNumber,
      full_name: this.editFullName,
      email: this.editEmail || undefined,
      phone: this.editPhone || undefined,
    };

    this.saving = true;
    this.errorMessage = '';

    this.loadingService
      .track(this.trainingService.updateParticipant(this.editingParticipant.id, payload))
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          this.message = response.message || 'Participante guardado correctamente.';
          this.closeEditModal();
          this.loadParticipants();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Error al guardar participante.';
        }
      });
  }

  refreshAfterSave(): void {
    this.message = 'Participante guardado correctamente.';
    this.loadParticipants();
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value.toLowerCase().trim();
    this.page = 1;
    this.applyFilter();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.page = page;
    }
  }

  onPageSizeChange(): void {
    this.page = 1;
  }

  sortBy(key: string): void {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }
    this.applyFilter();
  }

  getSortIcon(key: string): string {
    if (this.sortKey !== key) return 'unfold_more';
    return this.sortDirection === 'asc' ? 'north' : 'south';
  }

  private applyFilter(): void {
    let result = this.participants;

    if (this.searchQuery) {
      result = result.filter((p) =>
        (p.document_number || '').toLowerCase().includes(this.searchQuery) ||
        (p.full_name || '').toLowerCase().includes(this.searchQuery) ||
        (p.email || '').toLowerCase().includes(this.searchQuery) ||
        (p.phone || '').toLowerCase().includes(this.searchQuery)
      );
    }

    if (this.sortKey === 'document_number') {
      result.sort((a, b) => {
        const cmp = (a.document_number || '').localeCompare(b.document_number || '');
        return this.sortDirection === 'asc' ? cmp : -cmp;
      });
    } else if (this.sortKey === 'full_name') {
      result.sort((a, b) => {
        const cmp = (a.full_name || '').localeCompare(b.full_name || '');
        return this.sortDirection === 'asc' ? cmp : -cmp;
      });
    } else if (this.sortKey === 'email') {
      result.sort((a, b) => {
        const cmp = (a.email || '').localeCompare(b.email || '');
        return this.sortDirection === 'asc' ? cmp : -cmp;
      });
    } else if (this.sortKey === 'phone') {
      result.sort((a, b) => {
        const cmp = (a.phone || '').localeCompare(b.phone || '');
        return this.sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    this.filteredParticipants = result;
  }

  downloadReport(): void {
    if (this.exporting) return;

    this.errorMessage = '';
    this.exporting = true;

    this.loadingService.track(this.trainingService.downloadParticipantsReport())
      .pipe(finalize(() => (this.exporting = false)))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'reporte-participantes.xlsx';
          link.click();
          window.URL.revokeObjectURL(url);
          this.message = 'Reporte Excel descargado correctamente.';
        },
        error: () => (this.errorMessage = 'Error al descargar el reporte Excel.')
      });
  }

  importReport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || this.importing) {
      input.value = '';
      return;
    }

    this.errorMessage = '';
    this.importing = true;

    this.loadingService.track(this.trainingService.importParticipantsReport(file))
      .pipe(finalize(() => {
        this.importing = false;
        input.value = '';
      }))
      .subscribe({
        next: (result) => {
          this.message = `Carga procesada: ${result.created} creados, ${result.updated} actualizados y ${result.skipped} omitidos.`;
          if (result.errors.length > 0) {
            this.errorMessage = `Se omitieron ${result.skipped} filas por errores de validacion.`;
          }
          this.loadParticipants();
        },
        error: () => (this.errorMessage = 'Error al cargar el Excel de participantes.')
      });
  }

  remove(p: TrainingParticipant): void {
    if (!window.confirm(`Eliminar a ${p.full_name}?`)) return;

    this.loadingService.track(this.trainingService.deleteParticipant(p.id)).subscribe({
      next: (res) => {
        this.message = res.message;
        this.loadParticipants();
      },
      error: () => (this.errorMessage = 'Error al eliminar.')
    });
  }
}
