import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { LoadingService } from '../../core/services/loading.service';
import { User, UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NgbAlertModule],
  templateUrl: './user-list.component.html'
})
export class UserListComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly loadingService = inject(LoadingService);

  users: User[] = [];
  loading = false;
  message = '';
  errorMessage = '';

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.loadingService.track(this.userService.list())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (users) => (this.users = users),
        error: () => (this.errorMessage = 'No fue posible cargar los usuarios.')
      });
  }

  activate(user: User): void {
    this.loadingService.track(this.userService.activate(user.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.loadUsers();
      }
    });
  }

  deactivate(user: User): void {
    this.loadingService.track(this.userService.deactivate(user.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.loadUsers();
      }
    });
  }

  remove(user: User): void {
    const confirmed = window.confirm(`Eliminar a ${user.name}?`);

    if (!confirmed) {
      return;
    }

    this.loadingService.track(this.userService.delete(user.id)).subscribe({
      next: (response) => {
        this.message = response.message;
        this.loadUsers();
      }
    });
  }
}
