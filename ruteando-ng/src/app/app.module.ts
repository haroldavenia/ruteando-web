import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule, Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { HomeComponent } from './home.component';
import { TokenStorageService } from './token-storage.service';

const routes: Routes = [
  { path: '', component: HomeComponent },
];

@NgModule({
  declarations: [AppComponent, HomeComponent],
  imports: [BrowserModule, RouterModule.forRoot(routes)],
  providers: [TokenStorageService],
  bootstrap: [AppComponent]
})
export class AppModule {}
