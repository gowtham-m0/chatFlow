import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth-service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse } from '../../models/api-resonse';
import { Router, RouterLink } from '@angular/router';


@Component({
  selector: 'app-register',
  imports: [MatFormFieldModule,MatInputModule,MatButtonModule,RouterLink,CommonModule,FormsModule,MatIconModule,MatSnackBarModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  email!: string;
  password!: string;
  fullName!: string;
  userName!: string;
  profilePicture: string = "https://randomuser.me/api/portraits/lego/5.jpg";
  profileImage: File | null = null;

  snackBar = inject(MatSnackBar);
  authService = inject(AuthService);
  cdr = inject(ChangeDetectorRef);
  router = inject(Router);

  hide = signal(true);

  togglePassword(event:MouseEvent){
    this.hide.set(!this.hide());
  }

  onFileSelected(event: any) {
    const file : File = event.target.files[0];
    if (file) {
      this.profileImage = file;
      const reader = new FileReader();
      reader.onload = e => {
        this.profilePicture = e.target!.result as string;
        this.cdr.detectChanges();
      }
      reader.readAsDataURL(file);
    }
  }

  register(){
    let formData = new FormData();
    formData.append('email', this.email);
    formData.append('password', this.password);
    formData.append('fullName', this.fullName);
    formData.append('userName', this.userName);
    if(this.profileImage)
      formData.append('profileImage', this.profileImage);

    this.authService.register(formData).subscribe({
      next: (response) => {
        this.snackBar.open('User Registration successful!', 'Close', { duration: 3000 } );
      }
      ,error: (error: HttpErrorResponse) => {
        let err = error.error as ApiResponse<string>;
        this.snackBar.open(err.error  || "Something went wrong" , 'Close', { duration: 3000 } );
      },
      complete: () => {
        this.router.navigate(['/']);
      }
    });

  }

}
