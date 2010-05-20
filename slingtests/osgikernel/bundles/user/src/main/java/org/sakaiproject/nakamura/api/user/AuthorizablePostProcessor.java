/*
 * Licensed to the Sakai Foundation (SF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The SF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */
package org.sakaiproject.nakamura.api.user;

import org.apache.jackrabbit.api.security.user.Authorizable;
import org.apache.sling.servlets.post.Modification;

import javax.jcr.Session;

/**
 * 
 */
public interface AuthorizablePostProcessor {

  /**
   * @param authorizable
   * @param session
   * @param changes
   * @throws Exception
   */
  void process(Authorizable authorizable, Session session, Modification change)
      throws Exception;

  /**
   * @return the sequence in which this should be invoked 0 is first.
   */
  int getSequence();

}
