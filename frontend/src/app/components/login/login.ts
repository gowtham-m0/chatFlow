import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../services/auth-service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [MatFormFieldModule,MatInputModule,MatButtonModule,CommonModule,FormsModule,MatIconModule,RouterLink,MatSnackBarModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  email!: string;
  password!: string;

  hide = signal(true);

  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  login(){
    this.authService.login(this.email, this.password)
      .pipe(switchMap(()=> this.authService.me()))
      .subscribe({
        next: ()=>{
          this.snackBar.open("Logged in successfully", "Close", {duration: 3000});
        },
        error: (err:HttpErrorResponse)=>{
          let error = err.error
          this.snackBar.open(error.error || "Something went wrong", "Close", {duration: 3000});
        },
        complete:()=>{
          this.router.navigate(['/']);
        } 
      });

  }

  togglePassword(event: MouseEvent){
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

}
