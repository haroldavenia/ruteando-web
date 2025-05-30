import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { HomeComponent } from './home.component';
import { LoginComponent } from './login.component';
import { RegisterComponent } from './register.component';
import { TokenStorageService } from './token-storage.service';
import { AppRoutingModule } from './app-routing.module';
import { AppGlobalsService } from './app-globals.service';

@NgModule({
  declarations: [AppComponent, HomeComponent, LoginComponent, RegisterComponent],
  imports: [BrowserModule, AppRoutingModule],
  providers: [TokenStorageService, AppGlobalsService],
  bootstrap: [AppComponent]
})
export class AppModule {}
