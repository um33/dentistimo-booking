import mqtt, { MqttClient } from 'mqtt'
import * as dotenv from 'dotenv'
// import express, { Express, Request, Response } from 'express'
import mongoose, { CallbackError } from 'mongoose'
import appointment from './controllers/appointment'
import { IAppointment } from './interfaces/appointment'

dotenv.config()

const mongoURI: string =
  (process.env.MONGODB_URI as string) || 'mongodb://localhost:27017/dentistimo'
const mqttURI: string = process.env.MQTT_URI as string

export const client: MqttClient = mqtt.connect(mqttURI)

// Connect to MongoDB
mongoose.connect(mongoURI, (err: CallbackError) => {
  if (err) {
    // Connection failure here
    process.exit(1)
  }
  // Connection successful
})

// Publishes
client.on('connect', () => {
  // Published content include stringified JSON
  client.subscribe('bookings/#', { qos: 1 })
})

client.on('message', async (topic: string, message: Buffer) => {
  switch (topic) {
    case 'bookings/new': {
      const parsedMessage = JSON.parse(message.toString())
      // new topic here
      const newAppointment = await appointment.createAppointment(
        parsedMessage as IAppointment
      )
      client.publish('gateway/bookings/new', JSON.stringify(newAppointment))
      break
    }
    case 'bookings/get/range': {
      try {
        const parsedMessage = JSON.parse(message.toString())
        const appointments = await appointment.getAppointmentsWithinDateRange(
          parsedMessage.start,
          parsedMessage.end
        )
        client.publish(
          parsedMessage.responseTopic,
          JSON.stringify(appointments)
        )
      } catch (err) {
        // Handle error
      }
      break
    }
    case 'bookings/get/all': {
      const parsedMessage = JSON.parse(message.toString())
      const allAppointments = await appointment.getAppointmentHistoryFromUserId(
        parsedMessage.user_id
      )
      client.publish(
        parsedMessage.responseTopic,
        JSON.stringify(allAppointments)
      )
    }
  }
})
